"""CP-SAT constraint solver for timetable generation."""

from __future__ import annotations
import time
from collections import defaultdict
from ortools.sat.python import cp_model

from ..models import SolveRequest, SolveResponse, AssignmentResult, DiagnosticsPayload
from ..domain.types import Session, Slot
from ..domain.time_grid import build_time_grid, slots_per_day
from ..domain.session_expander import expand_sessions
from .feasibility import check_feasibility


def solve(req: SolveRequest) -> SolveResponse:
    t0 = time.time()

    # 1. Build time grid
    slots = build_time_grid(req.time_config)
    by_day = slots_per_day(slots)
    num_slots = len(slots)

    # 2. Expand sessions
    sessions = expand_sessions(req)

    if not sessions:
        return SolveResponse(
            status="SUCCESS", solve_time_ms=0, assignments=[],
            diagnostics=DiagnosticsPayload(reasons=["No sessions to schedule"]),
        )

    # 3. Lookups
    faculty_avail = {f.id: f.availability for f in req.faculty}
    room_avail = {r.id: r.availability for r in req.rooms}
    slot_global_map = {s.global_index: s for s in slots}
    day_slot_indices: dict[str, list[int]] = {}
    for s in slots:
        day_slot_indices.setdefault(s.day, []).append(s.global_index)

    # 4. Feasibility check
    reasons = check_feasibility(sessions, slots, faculty_avail, room_avail)
    if reasons:
        return SolveResponse(
            status="INFEASIBLE",
            solve_time_ms=int((time.time() - t0) * 1000),
            diagnostics=DiagnosticsPayload(reasons=reasons),
        )

    # 5. Build CP-SAT model using ALTERNATIVE decomposition
    # Instead of pairwise booleans, use per-(resource, slot) at-most-one.
    model = cp_model.CpModel()

    # --- Decision variables ---
    # For each session, for each (faculty, room, start_slot) combination,
    # create a boolean. Then exactly one must be true.
    # This is the "element-based" formulation, much more efficient for CP-SAT.

    # Pre-compute valid start slots per session
    def valid_starts_for_session(sess: Session) -> list[int]:
        starts = []
        for day, day_gis in day_slot_indices.items():
            sorted_gis = sorted(day_gis)
            for i in range(len(sorted_gis) - sess.duration + 1):
                if all(sorted_gis[i + d] == sorted_gis[i] + d for d in range(sess.duration)):
                    starts.append(sorted_gis[i])
        return starts

    def valid_starts_for_faculty(sess: Session, fid: str, all_starts: list[int]) -> list[int]:
        avail = faculty_avail.get(fid, {})
        valid_gi = set()
        for day, indices in avail.items():
            if day in day_slot_indices:
                for gi in day_slot_indices[day]:
                    slot = slot_global_map[gi]
                    if slot.index in indices:
                        valid_gi.add(gi)
        return [s for s in all_starts if all((s + d) in valid_gi for d in range(sess.duration))]

    def valid_starts_for_room(sess: Session, rid: str, all_starts: list[int]) -> list[int]:
        avail = room_avail.get(rid, {})
        valid_gi = set()
        for day, indices in avail.items():
            if day in day_slot_indices:
                for gi in day_slot_indices[day]:
                    slot = slot_global_map[gi]
                    if slot.index in indices:
                        valid_gi.add(gi)
        return [s for s in all_starts if all((s + d) in valid_gi for d in range(sess.duration))]

    # Per-session: list of (bool_var, fac_id, room_id, start_gi)
    session_options: dict[str, list[tuple]] = {}

    for sess in sessions:
        all_starts = valid_starts_for_session(sess)
        if not all_starts:
            return SolveResponse(
                status="INFEASIBLE",
                solve_time_ms=int((time.time() - t0) * 1000),
                diagnostics=DiagnosticsPayload(
                    reasons=[f"No valid slots for {sess.course_code} (duration={sess.duration})"]
                ),
            )

        options = []
        for fid in sess.qualified_faculty_ids:
            fac_starts = valid_starts_for_faculty(sess, fid, all_starts)
            for rid in sess.eligible_room_ids:
                room_starts = valid_starts_for_room(sess, rid, all_starts)
                both_starts = sorted(set(fac_starts) & set(room_starts))
                for gi in both_starts:
                    bv = model.new_bool_var(f"opt_{sess.id}_{fid}_{rid}_{gi}")
                    options.append((bv, fid, rid, gi))

        if not options:
            return SolveResponse(
                status="INFEASIBLE",
                solve_time_ms=int((time.time() - t0) * 1000),
                diagnostics=DiagnosticsPayload(
                    reasons=[f"No feasible (faculty, room, slot) for {sess.course_code}"]
                ),
            )

        # Exactly one option chosen per session
        model.add_exactly_one([o[0] for o in options])
        session_options[sess.id] = options

    # --- Resource no-overlap via at-most-one per (resource, global_slot) ---

    # Build: for each (faculty_id, global_slot_index) → list of bool_vars
    fac_slot_vars: dict[tuple[str, int], list] = defaultdict(list)
    room_slot_vars: dict[tuple[str, int], list] = defaultdict(list)
    batch_slot_vars: dict[tuple[str, int], list] = defaultdict(list)

    sess_map = {s.id: s for s in sessions}

    for sess in sessions:
        for (bv, fid, rid, start_gi) in session_options[sess.id]:
            for d in range(sess.duration):
                gi = start_gi + d
                fac_slot_vars[(fid, gi)].append(bv)
                room_slot_vars[(rid, gi)].append(bv)
                # Batch conflict: sessions from same batch must not overlap
                # UNLESS they are parallel lab groups from the same section
                batch_slot_vars[(sess.batch_id, gi, sess.section_id, bool(sess.lab_group_id))].append(bv)

    # Faculty: at most one session per slot per faculty
    for (fid, gi), bvs in fac_slot_vars.items():
        if len(bvs) > 1:
            model.add_at_most_one(bvs)

    # Room: at most one session per slot per room
    for (rid, gi), bvs in room_slot_vars.items():
        if len(bvs) > 1:
            model.add_at_most_one(bvs)

    # Batch: at most one session per slot per batch
    # Collect all booleans for a (batch_id, gi) but allow parallel lab groups
    batch_gi_vars: dict[tuple[str, int], list] = defaultdict(list)
    batch_gi_lab_section: dict[tuple[str, int], dict[str, list]] = defaultdict(lambda: defaultdict(list))

    for sess in sessions:
        for (bv, fid, rid, start_gi) in session_options[sess.id]:
            for d in range(sess.duration):
                gi = start_gi + d
                if sess.lab_group_id:
                    # Lab groups from same section can overlap
                    batch_gi_lab_section[(sess.batch_id, gi)][sess.section_id].append(bv)
                else:
                    batch_gi_vars[(sess.batch_id, gi)].append(bv)

    # Non-lab sessions in same batch at same time: at most one
    # Plus at most one non-lab + any lab section at same time
    # Simplification: collect all per (batch, gi) and add at-most-one,
    # but for lab groups from the SAME section, pick at most one representative
    # Actually the simplest correct approach: for each (batch, gi),
    # all non-lab booleans + one boolean per lab-section group must sum ≤ 1
    # But lab groups from same section CAN run in parallel.
    # So: non-lab sessions + (any lab group from each distinct section) ≤ 1 would be wrong
    # since a batch has one lecture and one lab in different time slots.
    #
    # The correct constraint: within a batch, at any given slot,
    # - at most one lecture can happen
    # - lab groups from the SAME section can run simultaneously
    # - a lecture and a lab cannot happen simultaneously
    #
    # Simplest: for each (batch, gi), sum of all options from non-lab sessions
    # plus sum of (max over lab groups from each section) ≤ 1
    # But max over lab groups is hard to express.
    #
    # Alternative: for each (batch, gi), create one "section active" bool per lab-section,
    # that is true iff ANY lab group from that section is active at that slot.
    # Then: all non-lab bools + all section-active bools ≤ 1.

    for (bid, gi), non_lab_bvs in batch_gi_vars.items():
        lab_sections = batch_gi_lab_section.get((bid, gi), {})
        all_exclusive = list(non_lab_bvs)

        for sec_id, lab_bvs in lab_sections.items():
            # Create a "section active" bool
            sec_active = model.new_bool_var(f"secact_{bid}_{gi}_{sec_id}")
            # sec_active == 1 iff any lab_bv is 1
            model.add_max_equality(sec_active, lab_bvs)
            all_exclusive.append(sec_active)

        if len(all_exclusive) > 1:
            model.add_at_most_one(all_exclusive)

    # Handle slots that only have lab sessions (no non-lab)
    for (bid, gi), lab_secs in batch_gi_lab_section.items():
        if (bid, gi) in batch_gi_vars:
            continue  # already handled above
        section_actives = []
        for sec_id, lab_bvs in lab_secs.items():
            sec_active = model.new_bool_var(f"secact2_{bid}_{gi}_{sec_id}")
            model.add_max_equality(sec_active, lab_bvs)
            section_actives.append(sec_active)
        if len(section_actives) > 1:
            model.add_at_most_one(section_actives)

    # --- Objective: prefer earlier slots (compact schedules) ---
    obj_terms = []
    for sess in sessions:
        for (bv, fid, rid, start_gi) in session_options[sess.id]:
            obj_terms.append(start_gi * bv)
    model.minimize(sum(obj_terms))

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    solver.parameters.num_workers = 4
    solver.parameters.log_search_progress = True

    status = solver.solve(model)
    elapsed = int((time.time() - t0) * 1000)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        for sess in sessions:
            for (bv, fid, rid, start_gi) in session_options[sess.id]:
                if solver.value(bv):
                    start_slot = slot_global_map[start_gi]
                    end_gi = start_gi + sess.duration - 1
                    end_slot = slot_global_map[end_gi]
                    assignments.append(AssignmentResult(
                        section_id=sess.section_id,
                        lab_group_id=sess.lab_group_id,
                        faculty_id=fid,
                        room_id=rid,
                        batch_id=sess.batch_id,
                        day=start_slot.day,
                        slot_index=start_slot.index,
                        duration=sess.duration,
                        course_code=sess.course_code,
                        course_name=sess.course_name,
                        start_time=start_slot.start_time,
                        end_time=end_slot.end_time,
                    ))
                    break

        return SolveResponse(
            status="SUCCESS",
            solve_time_ms=elapsed,
            total_score=solver.objective_value if status == cp_model.OPTIMAL else None,
            assignments=assignments,
            diagnostics=DiagnosticsPayload(
                hard_score=0,
                soft_score=solver.objective_value if status == cp_model.OPTIMAL else 0,
                reasons=[
                    f"Solver status: {'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}",
                    f"Total assignments: {len(assignments)}",
                    f"Solve time: {elapsed}ms",
                ],
            ),
        )
    else:
        return SolveResponse(
            status="INFEASIBLE",
            solve_time_ms=elapsed,
            diagnostics=DiagnosticsPayload(
                reasons=[
                    f"Solver status: {solver.status_name(status)}",
                    "The problem may be over-constrained. Try adding more rooms or faculty.",
                ],
            ),
        )
