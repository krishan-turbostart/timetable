import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const faculty = await prisma.faculty.findMany({
    orderBy: { name: "asc" },
    include: { facultyCourses: { include: { course: true } } },
  });
  return NextResponse.json(faculty);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { courseIds, ...facultyData } = body;

  const faculty = await prisma.faculty.create({
    data: {
      ...facultyData,
      facultyCourses: {
        create: (courseIds as string[]).map((courseId: string) => ({ courseId })),
      },
    },
    include: { facultyCourses: { include: { course: true } } },
  });
  return NextResponse.json(faculty, { status: 201 });
}
