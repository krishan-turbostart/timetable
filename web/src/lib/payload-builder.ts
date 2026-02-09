import { prisma } from "@/lib/prisma";
import type { SolvePayload } from "@/lib/solver-client";

export async function buildSolverPayload(scheduleId: string): Promise<SolvePayload> {
  const schedule = await prisma.schedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: { timeConfig: true },
  });

  if (!schedule.timeConfig) {
    throw new Error("Schedule has no time configuration");
  }

  const tc = schedule.timeConfig;

  const courses = await prisma.course.findMany({
    include: { sections: { include: { labGroups: true } } },
  });

  const facultyList = await prisma.faculty.findMany({
    include: { facultyCourses: true },
  });

  const rooms = await prisma.room.findMany();

  const batches = await prisma.batch.findMany({
    include: { batchSections: true },
  });

  return {
    schedule_id: scheduleId,
    time_config: {
      days: tc.days,
      start_time: tc.startTime,
      end_time: tc.endTime,
      slot_duration: tc.slotDuration,
      break_start: tc.breakStart,
      break_end: tc.breakEnd,
    },
    courses: courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      hours_per_week: c.hoursPerWeek,
      sessions_per_week: c.sessionsPerWeek,
      sections: c.sections.map((s) => ({
        id: s.id,
        name: s.name,
        lab_groups: s.labGroups.map((lg) => ({ id: lg.id, name: lg.name })),
      })),
    })),
    faculty: facultyList.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      max_hours: f.maxHours,
      availability: (f.availability as Record<string, number[]>) ?? {},
      qualified_course_ids: f.facultyCourses.map((fc) => fc.courseId),
    })),
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      availability: (r.availability as Record<string, number[]>) ?? {},
    })),
    batches: batches.map((b) => ({
      id: b.id,
      name: b.name,
      student_count: b.studentCount,
      section_ids: b.batchSections.map((bs) => bs.sectionId),
    })),
  };
}
