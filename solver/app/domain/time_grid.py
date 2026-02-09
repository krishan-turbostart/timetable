"""Builds an ordered list of Slots from the time config, excluding break slots."""

from __future__ import annotations
from ..models import TimeConfigPayload
from .types import Slot


def _time_to_minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _minutes_to_time(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def build_time_grid(config: TimeConfigPayload) -> list[Slot]:
    """Return ordered Slot list for all days, excluding break slots."""
    start = _time_to_minutes(config.start_time)
    end = _time_to_minutes(config.end_time)
    brk_start = _time_to_minutes(config.break_start)
    brk_end = _time_to_minutes(config.break_end)
    dur = config.slot_duration

    slots: list[Slot] = []
    global_idx = 0

    for day in config.days:
        day_idx = 0
        t = start
        while t + dur <= end:
            # Skip if slot overlaps with break
            if t < brk_end and t + dur > brk_start:
                t = brk_end  # jump past break
                continue
            slots.append(Slot(
                day=day,
                index=day_idx,
                start_time=_minutes_to_time(t),
                end_time=_minutes_to_time(t + dur),
                global_index=global_idx,
            ))
            day_idx += 1
            global_idx += 1
            t += dur

    return slots


def slots_per_day(slots: list[Slot]) -> dict[str, list[Slot]]:
    """Group slots by day."""
    by_day: dict[str, list[Slot]] = {}
    for s in slots:
        by_day.setdefault(s.day, []).append(s)
    return by_day
