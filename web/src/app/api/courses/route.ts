import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
    include: {
      sections: { include: { labGroups: true } },
      facultyCourses: { include: { faculty: true } },
    },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sections: sectionNames, labGroupsPerSection, ...courseData } = body;

  const course = await prisma.course.create({
    data: {
      ...courseData,
      sections: {
        create: (sectionNames as string[]).map((name: string) => ({
          name,
          ...(courseData.type === "LAB" && labGroupsPerSection > 0
            ? {
                labGroups: {
                  create: Array.from({ length: labGroupsPerSection }, (_, i) => ({
                    name: `G${i + 1}`,
                  })),
                },
              }
            : {}),
        })),
      },
    },
    include: { sections: { include: { labGroups: true } } },
  });
  return NextResponse.json(course, { status: 201 });
}
