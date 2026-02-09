from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Slot:
    day: str
    index: int  # 0-based index within day (excludes break slots)
    start_time: str  # "09:00"
    end_time: str  # "10:00"
    global_index: int  # unique index across all days


@dataclass
class Session:
    """One atomic scheduling unit."""
    id: str
    course_id: str
    course_code: str
    course_name: str
    course_type: str  # "LECTURE" | "LAB"
    section_id: str
    lab_group_id: str | None
    batch_id: str
    duration: int  # number of slots
    qualified_faculty_ids: list[str]
    eligible_room_ids: list[str]
