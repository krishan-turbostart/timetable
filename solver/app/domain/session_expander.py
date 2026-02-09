"""Expands courses + batches into atomic Session objects."""

from __future__ import annotations
from ..models import SolveRequest
from .types import Session


def expand_sessions(req: SolveRequest) -> list[Session]:
    """
    For each batch → each enrolled section → generate sessions_per_week Session objects.
    Lab courses with lab groups generate one session per lab group instead of per section.
    """
    # Build lookup maps
    course_map = {c.id: c for c in req.courses}
    section_map = {}
    for c in req.courses:
        for sec in c.sections:
            section_map[sec.id] = (c, sec)

    # Faculty qualified for each course
    course_faculty: dict[str, list[str]] = {}
    for f in req.faculty:
        for cid in f.qualified_course_ids:
            course_faculty.setdefault(cid, []).append(f.id)

    # Eligible rooms per course type
    lecture_rooms = [r.id for r in req.rooms if r.type == "LECTURE"]
    lab_rooms = [r.id for r in req.rooms if r.type == "LAB"]

    sessions: list[Session] = []
    session_counter = 0

    for batch in req.batches:
        for sec_id in batch.section_ids:
            if sec_id not in section_map:
                continue
            course, section = section_map[sec_id]
            qualified = course_faculty.get(course.id, [])
            eligible_rooms = lab_rooms if course.type == "LAB" else lecture_rooms

            if course.type == "LAB" and section.lab_groups:
                # One session per lab group per sessions_per_week
                for lg in section.lab_groups:
                    for _ in range(course.sessions_per_week):
                        duration = course.hours_per_week // course.sessions_per_week
                        sessions.append(Session(
                            id=f"s{session_counter}",
                            course_id=course.id,
                            course_code=course.code,
                            course_name=course.name,
                            course_type=course.type,
                            section_id=section.id,
                            lab_group_id=lg.id,
                            batch_id=batch.id,
                            duration=duration,
                            qualified_faculty_ids=qualified,
                            eligible_room_ids=eligible_rooms,
                        ))
                        session_counter += 1
            else:
                # Lecture: one session per sessions_per_week
                for _ in range(course.sessions_per_week):
                    duration = course.hours_per_week // course.sessions_per_week
                    if duration < 1:
                        duration = 1
                    sessions.append(Session(
                        id=f"s{session_counter}",
                        course_id=course.id,
                        course_code=course.code,
                        course_name=course.name,
                        course_type=course.type,
                        section_id=section.id,
                        lab_group_id=None,
                        batch_id=batch.id,
                        duration=duration,
                        qualified_faculty_ids=qualified,
                        eligible_room_ids=eligible_rooms,
                    ))
                    session_counter += 1

    return sessions
