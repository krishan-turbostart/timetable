"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSchedule } from "@/hooks/use-schedules";
import { TimetableGrid } from "@/components/timetable-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

interface Entity {
  id: string;
  name: string;
}

export default function TimetablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { schedule, isLoading } = useSchedule(id);
  const [viewType, setViewType] = useState<"batch" | "faculty" | "room">("batch");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [assignments, setAssignments] = useState<unknown[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Load entities when view type changes
  useEffect(() => {
    const endpoints: Record<string, string> = {
      batch: "/api/batches",
      faculty: "/api/faculty",
      room: "/api/rooms",
    };
    fetcher(endpoints[viewType]).then((data: Entity[]) => {
      setEntities(data);
      if (data.length > 0) setSelectedEntity(data[0].id);
    });
  }, [viewType]);

  // Load assignments when entity or schedule changes
  useEffect(() => {
    if (!selectedEntity || !id) return;
    setLoadingAssignments(true);

    const paramKey =
      viewType === "batch"
        ? "batchId"
        : viewType === "faculty"
        ? "facultyId"
        : "roomId";

    fetcher(`/api/assignments?scheduleId=${id}&${paramKey}=${selectedEntity}`)
      .then(setAssignments)
      .finally(() => setLoadingAssignments(false));
  }, [id, selectedEntity, viewType]);

  if (isLoading) return <div>Loading...</div>;
  if (!schedule) return <div>Schedule not found</div>;

  const tc = schedule.timeConfig;
  const days = tc?.days ?? ["MON", "TUE", "WED", "THU", "FRI"];

  // Build slot list from time config
  const slots: { index: number; startTime: string; endTime: string }[] = [];
  if (tc) {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const toTime = (m: number) =>
      `${Math.floor(m / 60)
        .toString()
        .padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;

    const start = toMin(tc.startTime);
    const end = toMin(tc.endTime);
    const brkStart = toMin(tc.breakStart);
    const brkEnd = toMin(tc.breakEnd);
    let idx = 0;
    let t = start;
    while (t + tc.slotDuration <= end) {
      if (t < brkEnd && t + tc.slotDuration > brkStart) {
        t = brkEnd;
        continue;
      }
      slots.push({
        index: idx,
        startTime: toTime(t),
        endTime: toTime(t + tc.slotDuration),
      });
      idx++;
      t += tc.slotDuration;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/schedules/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{schedule.name} - Timetable</h1>
          <p className="text-sm text-muted-foreground">{schedule.semester}</p>
        </div>
      </div>

      <Tabs
        value={viewType}
        onValueChange={(v) => setViewType(v as "batch" | "faculty" | "room")}
      >
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="batch">By Batch</TabsTrigger>
            <TabsTrigger value="faculty">By Faculty</TabsTrigger>
            <TabsTrigger value="room">By Room</TabsTrigger>
          </TabsList>

          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={`Select ${viewType}`} />
            </SelectTrigger>
            <SelectContent>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={viewType} className="mt-4">
          {loadingAssignments ? (
            <div>Loading timetable...</div>
          ) : (assignments as unknown[]).length === 0 ? (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
              No assignments found. Run the solver first.
            </div>
          ) : (
            <TimetableGrid
              assignments={assignments as never[]}
              days={days}
              slots={slots}
              viewType={viewType}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
