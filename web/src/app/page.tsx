import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, DoorOpen, GraduationCap, CalendarClock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [courseCount, facultyCount, roomCount, batchCount, schedules] =
    await Promise.all([
      prisma.course.count(),
      prisma.faculty.count(),
      prisma.room.count(),
      prisma.batch.count(),
      prisma.schedule.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { _count: { select: { assignments: true } } },
      }),
    ]);

  const stats = [
    { label: "Courses", value: courseCount, icon: BookOpen, href: "/courses" },
    { label: "Faculty", value: facultyCount, icon: Users, href: "/faculty" },
    { label: "Rooms", value: roomCount, icon: DoorOpen, href: "/rooms" },
    { label: "Batches", value: batchCount, icon: GraduationCap, href: "/batches" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Schedules</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground">No schedules yet.</p>
        ) : (
          <div className="grid gap-3">
            {schedules.map((s) => (
              <Link key={s.id} href={`/schedules/${s.id}`}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <CalendarClock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{s.semester}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {s._count.assignments} assignments
                      </span>
                      <span
                        className={
                          s.status === "SOLVED"
                            ? "text-green-600"
                            : s.status === "FINALIZED"
                            ? "text-blue-600"
                            : "text-yellow-600"
                        }
                      >
                        {s.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
