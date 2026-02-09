import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const rooms = await prisma.room.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const room = await prisma.room.create({ data: body });
  return NextResponse.json(room, { status: 201 });
}
