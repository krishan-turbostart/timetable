import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      timeConfig: true,
      _count: { select: { assignments: true } },
      solverRuns: { orderBy: { startedAt: "desc" }, take: 5 },
    },
  });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(schedule);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { timeConfig, _count, solverRuns: _sr, ...scheduleData } = body;

  const schedule = await prisma.$transaction(async (tx) => {
    if (timeConfig) {
      const { id: _tcId, scheduleId: _sId, ...tcData } = timeConfig;
      await tx.timeConfig.upsert({
        where: { scheduleId: id },
        update: tcData,
        create: { scheduleId: id, ...tcData },
      });
    }
    return tx.schedule.update({
      where: { id },
      data: scheduleData,
      include: { timeConfig: true },
    });
  });
  return NextResponse.json(schedule);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
