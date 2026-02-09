from __future__ import annotations
from pydantic import BaseModel


class TimeConfigPayload(BaseModel):
    days: list[str]  # ["MON","TUE",...]
    start_time: str  # "09:00"
    end_time: str  # "17:00"
    slot_duration: int  # minutes
    break_start: str  # "12:00"
    break_end: str  # "13:00"


class SectionPayload(BaseModel):
    id: str
    name: str  # "A", "B"
    lab_groups: list[LabGroupPayload] = []


class LabGroupPayload(BaseModel):
    id: str
    name: str  # "G1", "G2"


class CoursePayload(BaseModel):
    id: str
    code: str
    name: str
    type: str  # "LECTURE" | "LAB"
    hours_per_week: int
    sessions_per_week: int
    sections: list[SectionPayload]


class FacultyPayload(BaseModel):
    id: str
    name: str
    type: str  # "FULLTIME" | "PARTTIME" | "GUEST"
    max_hours: int
    availability: dict[str, list[int]]  # {"MON": [0,1,2,4,5,6]}
    qualified_course_ids: list[str]


class RoomPayload(BaseModel):
    id: str
    name: str
    type: str  # "LECTURE" | "LAB"
    capacity: int
    availability: dict[str, list[int]]


class BatchPayload(BaseModel):
    id: str
    name: str
    student_count: int
    section_ids: list[str]


class SolveRequest(BaseModel):
    schedule_id: str
    time_config: TimeConfigPayload
    courses: list[CoursePayload]
    faculty: list[FacultyPayload]
    rooms: list[RoomPayload]
    batches: list[BatchPayload]


class AssignmentResult(BaseModel):
    section_id: str
    lab_group_id: str | None = None
    faculty_id: str
    room_id: str
    batch_id: str
    day: str
    slot_index: int
    duration: int  # in slots
    course_code: str
    course_name: str
    start_time: str
    end_time: str


class SolveResponse(BaseModel):
    status: str  # "SUCCESS" | "INFEASIBLE" | "FAILED"
    solve_time_ms: int
    total_score: float | None = None
    assignments: list[AssignmentResult] = []
    diagnostics: DiagnosticsPayload | None = None


class DiagnosticsPayload(BaseModel):
    hard_score: float = 0.0
    soft_score: float = 0.0
    reasons: list[str] = []
