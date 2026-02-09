Below is a practical **solver architecture** that fits your PRD, scales from “small college” to “university”, stays explainable, and supports “lock & regenerate”.

---

# Solver Architecture

## 1) Core idea

Treat timetabling as a **Constraint Satisfaction + Optimization** pipeline:

1. Normalize inputs → build a **slot grid**
2. Expand courses into **Session Instances**
3. Run **Feasibility checks**
4. Solve with **CP-SAT (primary)** to get a valid timetable
5. Improve with **local search / GA (optional)** for “prettier” schedules
6. Produce outputs + explanations + audit logs

---

# 2) System Components (Modules)

## 2.1 Domain Layer (Data → Canonical Model)

**Goal:** Convert messy user inputs into clean, solver-ready structures.

### Components

* **TimeGridBuilder**

  * Input: working hours, slot duration, breaks, workdays
  * Output: ordered slots (Day × SlotIndex), plus blocked slots

* **AvailabilityCompiler**

  * Input: faculty/room/batch availability matrices
  * Output: allowed slots sets per entity

* **SessionExpander**

  * Input: courses + sections + lab groups + sessions/week + duration
  * Output: atomic `Session` list (each session is a scheduling unit)

* **CompatibilityResolver**

  * Faculty-qualified courses mapping
  * Room-type & feature compatibility mapping
  * Capacity constraints mapping

### Canonical Types (internal)

* `Slot { day, start_time, end_time, slot_id }`
* `Session { id, course_id, group_id, duration_slots, required_room_type, allowed_faculty_ids, size }`
* `Group { id, type=batch|section|labgroup, size }`
* `Resource { id, type=faculty|room, availability_allowed_slots }`

---

## 2.2 Constraint Model Layer (Model Builder)

**Goal:** Translate the canonical model into solver variables + constraints.

### Components

* **VariableFactory**

  * Creates decision variables for each session:

    * `start_slot(session)`
    * `room(session)`
    * `faculty(session)`
  * Adds optional “presence” vars if you later support optional sessions.

* **ConstraintBuilder**

  * Adds hard constraints (no overlap, availability, capacity, compatibility)
  * Adds linking constraints (if a session assigned to room, room must be compatible)
  * Adds “locked” constraints for pinned sessions

* **ObjectiveBuilder**

  * Encodes soft constraints into penalties (weighted)
  * Produces a single objective: minimize total penalty

---

## 2.3 Solver Engine Layer

**Goal:** Find feasible + optimized solutions and provide multiple candidates.

### Components

* **FeasibilityPrecheckEngine**

  * Quick checks before modeling:

    * required session-hours vs available slot-hours by room type
    * faculty load feasibility
    * availability intersection existence
  * Output: fail reasons with actionable messages

* **Primary Solver: CP-SAT Runner**

  * Responsible for:

    * first feasible solution
    * optimized solution under time limit
    * solution pool (top N)

* **Secondary Improver (Optional)**

  * Local search (hill climbing / simulated annealing)
  * GA polishing (only if needed)
  * Must preserve feasibility:

    * either operate on feasible solutions only
    * or use repair operators

* **Regeneration Manager**

  * Takes “locks” + previous solution
  * Re-solves only the “unlocked” portion using:

    * warm-start hints (previous assignments as preferred values)
    * partial neighborhood search (LNS) approach

---

## 2.4 Explainability & Diagnostics Layer

**Goal:** Make the solver trustworthy.

### Components

* **Infeasibility Explainer**

  * Uses:

    * precheck failure reasons
    * solver conflict extraction strategy (approx if CP-SAT doesn’t provide full IIS)
  * Output examples:

    * “Course X lab needs 2 labs but only 1 lab is available Tue–Thu 2–5pm.”
    * “Faculty Y only available 2 slots, but assigned 4 sessions.”

* **Score Breakdown Generator**

  * For each soft constraint:

    * penalty count
    * weighted contribution
  * Enables “why this timetable won”

* **Audit Logger**

  * Records:

    * locks applied
    * manual overrides
    * solver seed, time limit, objective value

---

# 3) Decision Variables & Modeling Strategy

## 3.1 Recommended variable design (robust + scalable)

### For each session `s`

* `start[s]` = integer slot index (start of the session)
* `room[s]` = integer room id (domain restricted to compatible rooms)
* `faculty[s]` = integer faculty id (domain restricted to qualified faculty)

Also:

* `interval[s]` = an interval variable (start + duration) for overlap constraints
  (Even if you don’t code now, architecturally this is the right concept.)

---

# 4) Hard Constraints (implementation-independent)

## 4.1 Availability

* `start[s]` must be in allowed start slots for:

  * group (batch/section)
  * faculty candidate(s)
  * compatible room candidate(s)

To avoid huge constraints:

* Precompute `AllowedStartSlots(session, faculty, room)` where possible
* Or restrict in layers:

  1. allowed slots for group
  2. allowed slots for faculty
  3. allowed slots for room

## 4.2 No overlap constraints

* For each faculty `f`: sessions assigned to `f` must not overlap
* For each room `r`: sessions assigned to `r` must not overlap
* For each group `g`: sessions for `g` must not overlap

## 4.3 Qualification & compatibility

* `faculty[s] ∈ QualifiedFaculty(course[s])`
* `room[s] ∈ CompatibleRooms(required_room_type, features)`
* `capacity(room[s]) ≥ group_size(s)`

## 4.4 Breaks / blocked slots

* Disallow sessions whose interval intersects break slots.

## 4.5 Locks

* If locked time: `start[s] == locked_start`
* If locked faculty: `faculty[s] == locked_faculty`
* If locked room: `room[s] == locked_room`

---

# 5) Soft Constraints (objective architecture)

Keep soft constraints modular as **PenaltyModules** so you can add/remove without rewriting.

Each module returns:

* a list of penalty variables
* a weighted sum

### Example PenaltyModules

* `MinimizeGroupGaps(group)`
* `MinimizeFacultyIdleTime(faculty)`
* `AvoidLateSlots(session)`
* `SpreadCourseAcrossWeek(course, section)`
* `RoomStability(course, section)`

**Objective = Σ(weight_i × penalty_i)**

---

# 6) Search Strategy & Scaling

## 6.1 Phased solve (recommended)

**Phase A: Feasible First**

* Ignore most soft constraints
* Use only essential hard constraints
* Goal: get *any* valid schedule fast

**Phase B: Optimize**

* Add soft constraints gradually (or all at once)
* Run CP-SAT with time limit
* Collect N best solutions (solution pool)

**Phase C: Polish (optional)**

* Local search moves:

  * swap sessions
  * move session to another slot
  * change room within compatible set
  * change faculty within qualified set
* Only accept moves that keep feasibility

## 6.2 Large Neighborhood Search (LNS) for “lock & regenerate”

When user locks a few sessions:

* Freeze locked sessions
* Pick a neighborhood:

  * same day
  * same batch
  * same room type
* Unassign those sessions and re-optimize
  This avoids full re-solve and feels “interactive”.

---

# 7) Candidate Generation: “Top N schedules”

Users love options.

Architecture approach:

* CP-SAT runner produces:

  * `best_solution`
  * `next_best_solutions` by adding diversity constraints:

    * “must differ in at least K sessions”
    * or penalize similarity to previous solution

---

# 8) Interfaces Between Modules (Contracts)

## 8.1 Inputs to Solver Engine

* `CanonicalModel`:

  * slots
  * sessions
  * groups
  * faculty, rooms
  * availability constraints
  * locks
  * weights for soft constraints

## 8.2 Outputs

* `SolutionSet`:

  * list of solutions {assignments, objective_score, breakdown}
* `Diagnostics`:

  * infeasibility reasons
  * warnings (tight constraints)
* `Artifacts`:

  * batch timetable
  * faculty timetable
  * room timetable

---

# 9) Minimal MVP Solver Architecture (what you build first)

If you want a fast v1:

1. Build canonical model + session expansion
2. Implement hard constraints only
3. CP-SAT feasible solution
4. Add 2 soft constraints:

   * minimize batch gaps
   * minimize faculty gaps
5. Add locks + LNS regeneration
6. Add explainability (prechecks + score breakdown)

That gives a product that already feels “smart”.

---

# 10) Failure Modes & How Architecture Handles Them

### Overconstrained inputs

* Precheck engine returns ranked failure reasons + “what to relax”

### Too slow

* Phased solve + timeouts + LNS partial solve
* Use heuristic ordering: schedule labs first, then lectures

### Unfair loads

* Add soft constraint module: balance faculty load distribution

