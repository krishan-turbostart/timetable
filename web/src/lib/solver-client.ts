const SOLVER_URL = process.env.SOLVER_URL || "http://localhost:8000";

export interface SolvePayload {
  schedule_id: string;
  time_config: {
    days: string[];
    start_time: string;
    end_time: string;
    slot_duration: number;
    break_start: string;
    break_end: string;
  };
  courses: {
    id: string;
    code: string;
    name: string;
    type: string;
    hours_per_week: number;
    sessions_per_week: number;
    sections: {
      id: string;
      name: string;
      lab_groups: { id: string; name: string }[];
    }[];
  }[];
  faculty: {
    id: string;
    name: string;
    type: string;
    max_hours: number;
    availability: Record<string, number[]>;
    qualified_course_ids: string[];
  }[];
  rooms: {
    id: string;
    name: string;
    type: string;
    capacity: number;
    availability: Record<string, number[]>;
  }[];
  batches: {
    id: string;
    name: string;
    student_count: number;
    section_ids: string[];
  }[];
}

export interface SolveResult {
  status: string;
  solve_time_ms: number;
  total_score: number | null;
  assignments: {
    section_id: string;
    lab_group_id: string | null;
    faculty_id: string;
    room_id: string;
    batch_id: string;
    day: string;
    slot_index: number;
    duration: number;
    course_code: string;
    course_name: string;
    start_time: string;
    end_time: string;
  }[];
  diagnostics: {
    hard_score: number;
    soft_score: number;
    reasons: string[];
  } | null;
}

export async function callSolver(payload: SolvePayload): Promise<SolveResult> {
  const res = await fetch(`${SOLVER_URL}/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Solver error (${res.status}): ${text}`);
  }
  return res.json();
}
