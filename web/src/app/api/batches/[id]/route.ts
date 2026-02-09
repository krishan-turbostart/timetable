import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      batchSections: {
        include: { section: { include: { course: true } } },
      },
    },
  });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { sectionIds, batchSections: _bs, ...batchData } = body;

  const batch = await prisma.$transaction(async (tx) => {
    await tx.batchSection.deleteMany({ where: { batchId: id } });
    return tx.batch.update({
      where: { id },
      data: {
        ...batchData,
        batchSections: {
          create: (sectionIds as string[]).map((sectionId: string) => ({ sectionId })),
        },
      },
      include: {
        batchSections: {
          include: { section: { include: { course: true } } },
        },
      },
    });
  });
  return NextResponse.json(batch);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.batch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
