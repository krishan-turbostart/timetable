import { prisma } from "@/lib/prisma";
import { buildSolverPayload } from "@/lib/payload-builder";
import { callSolver } from "@/lib/solver-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { scheduleId } = await req.json();

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
  }

  // Create solver run record
  const solverRun = await prisma.solverRun.create({
    data: { scheduleId, status: "RUNNING" },
  });

  try {
    // Build payload from DB
    const payload = await buildSolverPayload(scheduleId);

    // Call solver
    const result = await callSolver(payload);

    if (result.status === "SUCCESS" && result.assignments.length > 0) {
      // Delete existing assignments and save new ones
      await prisma.$transaction(async (tx) => {
        await tx.assignment.deleteMany({ where: { scheduleId } });
        await tx.assignment.createMany({
          data: result.assignments.map((a) => ({
            scheduleId,
            sectionId: a.section_id,
            labGroupId: a.lab_group_id,
            facultyId: a.faculty_id,
            roomId: a.room_id,
            batchId: a.batch_id,
            day: a.day,
            slotIndex: a.slot_index,
            duration: a.duration,
            courseCode: a.course_code,
            courseName: a.course_name,
            startTime: a.start_time,
            endTime: a.end_time,
          })),
        });
        await tx.schedule.update({
          where: { id: scheduleId },
          data: { status: "SOLVED" },
        });
      });
    }

    // Update solver run
    await prisma.solverRun.update({
      where: { id: solverRun.id },
      data: {
        status: result.status,
        finishedAt: new Date(),
        solveTimeMs: result.solve_time_ms,
        totalScore: result.total_score,
        diagnostics: result.diagnostics as object,
      },
    });

    return NextResponse.json({
      status: result.status,
      solveTimeMs: result.solve_time_ms,
      totalAssignments: result.assignments.length,
      diagnostics: result.diagnostics,
    });
  } catch (err) {
    // Update solver run as failed
    await prisma.solverRun.update({
      where: { id: solverRun.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        diagnostics: { error: err instanceof Error ? err.message : "Unknown error" },
      },
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Solver failed" },
      { status: 500 }
    );
  }
}
