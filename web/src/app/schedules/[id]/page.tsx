"use client";

import { use } from "react";
import Link from "next/link";
import { useSchedule } from "@/hooks/use-schedules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, Clock, Play, Grid3X3 } from "lucide-react";
import { SolverPanel } from "@/components/solver-panel";

export default function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { schedule, isLoading, mutate } = useSchedule(id);

  if (isLoading) return <div>Loading...</div>;
  if (!schedule) return <div>Schedule not found</div>;

  const tc = schedule.timeConfig;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{schedule.name}</h1>
          <p className="text-muted-foreground">{schedule.semester}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              schedule.status === "SOLVED"
                ? "default"
                : schedule.status === "FINALIZED"
                ? "secondary"
                : "outline"
            }
          >
            {schedule.status}
          </Badge>
          {schedule._count.assignments > 0 && (
            <Link href={`/schedules/${id}/timetable`}>
              <Button>
                <Grid3X3 className="mr-2 h-4 w-4" />
                View Timetable
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tc ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days</span>
                  <span>{tc.days.join(", ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours</span>
                  <span>{tc.startTime} - {tc.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot Duration</span>
                  <span>{tc.slotDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Break</span>
                  <span>{tc.breakStart} - {tc.breakEnd}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No time config set</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{schedule.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assignments</span>
              <span>{schedule._count.assignments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solver Runs</span>
              <span>{schedule.solverRuns?.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <SolverPanel scheduleId={id} onSolved={() => mutate()} />

      {schedule.solverRuns && schedule.solverRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Solver History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedule.solverRuns.map((run: {
                id: string;
                status: string;
                startedAt: string;
                solveTimeMs: number | null;
                totalScore: number | null;
              }) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        run.status === "SUCCESS" ? "default" : "destructive"
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-muted-foreground">
                    {run.solveTimeMs && <span>{run.solveTimeMs}ms</span>}
                    {run.totalScore !== null && <span>Score: {run.totalScore}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
