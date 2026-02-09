import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const batches = await prisma.batch.findMany({
    orderBy: { name: "asc" },
    include: {
      batchSections: {
        include: { section: { include: { course: true } } },
      },
    },
  });
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sectionIds, ...batchData } = body;

  const batch = await prisma.batch.create({
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
  return NextResponse.json(batch, { status: 201 });
}
