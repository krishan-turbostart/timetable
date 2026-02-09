import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      timeConfig: true,
      _count: { select: { assignments: true } },
    },
  });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { timeConfig, ...scheduleData } = body;

  const schedule = await prisma.schedule.create({
    data: {
      ...scheduleData,
      timeConfig: { create: timeConfig },
    },
    include: { timeConfig: true },
  });
  return NextResponse.json(schedule, { status: 201 });
}
