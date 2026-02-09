"""Pre-validation checks before running the solver."""

from __future__ import annotations
from ..domain.types import Session, Slot


def check_feasibility(
    sessions: list[Session],
    slots: list[Slot],
    faculty_availability: dict[str, dict[str, list[int]]],
    room_availability: dict[str, dict[str, list[int]]],
) -> list[str]:
    """Return list of reasons the problem is infeasible, or empty if OK."""
    reasons: list[str] = []

    total_slot_count = len(slots)
    total_session_slots = sum(s.duration for s in sessions)

    # Check: sessions with no qualified faculty
    for s in sessions:
        if not s.qualified_faculty_ids:
            reasons.append(
                f"Session {s.id} ({s.course_code} sec {s.section_id}) "
                f"has no qualified faculty"
            )

    # Check: sessions with no eligible rooms
    for s in sessions:
        if not s.eligible_room_ids:
            reasons.append(
                f"Session {s.id} ({s.course_code}) has no eligible rooms"
            )

    # Check: not enough total room-slots
    unique_rooms = set()
    for s in sessions:
        for r in s.eligible_room_ids:
            unique_rooms.add(r)
    total_room_slots = total_slot_count * len(unique_rooms)
    if total_session_slots > total_room_slots:
        reasons.append(
            f"Total session-slots ({total_session_slots}) exceeds "
            f"available room-slots ({total_room_slots})"
        )

    return reasons
