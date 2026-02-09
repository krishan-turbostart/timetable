import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const faculty = await prisma.faculty.findUnique({
    where: { id },
    include: { facultyCourses: { include: { course: true } } },
  });
  if (!faculty) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(faculty);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { courseIds, facultyCourses: _fc, ...facultyData } = body;

  // Update faculty and re-create qualifications
  const faculty = await prisma.$transaction(async (tx) => {
    await tx.facultyCourse.deleteMany({ where: { facultyId: id } });
    return tx.faculty.update({
      where: { id },
      data: {
        ...facultyData,
        facultyCourses: {
          create: (courseIds as string[]).map((courseId: string) => ({ courseId })),
        },
      },
      include: { facultyCourses: { include: { course: true } } },
    });
  });
  return NextResponse.json(faculty);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.faculty.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
