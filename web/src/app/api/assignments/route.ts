import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const scheduleId = searchParams.get("scheduleId");

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
  }

  const batchId = searchParams.get("batchId");
  const facultyId = searchParams.get("facultyId");
  const roomId = searchParams.get("roomId");

  const where: Record<string, unknown> = { scheduleId };
  if (batchId) where.batchId = batchId;
  if (facultyId) where.facultyId = facultyId;
  if (roomId) where.roomId = roomId;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      faculty: { select: { name: true } },
      room: { select: { name: true } },
      batch: { select: { name: true } },
    },
    orderBy: [{ day: "asc" }, { slotIndex: "asc" }],
  });

  return NextResponse.json(assignments);
}
