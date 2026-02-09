"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: {
    id: string;
    name: string;
    semester: string;
    timeConfig?: {
      days: string[];
      startTime: string;
      endTime: string;
      slotDuration: number;
      breakStart: string;
      breakEnd: string;
    } | null;
  } | null;
  onSuccess: () => void;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess,
}: ScheduleFormDialogProps) {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [days, setDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(60);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [loading, setLoading] = useState(false);

  const isEdit = !!schedule;

  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setSemester(schedule.semester);
      if (schedule.timeConfig) {
        setDays(schedule.timeConfig.days);
        setStartTime(schedule.timeConfig.startTime);
        setEndTime(schedule.timeConfig.endTime);
        setSlotDuration(schedule.timeConfig.slotDuration);
        setBreakStart(schedule.timeConfig.breakStart);
        setBreakEnd(schedule.timeConfig.breakEnd);
      }
    } else {
      setName("");
      setSemester("");
      setDays(["MON", "TUE", "WED", "THU", "FRI"]);
      setStartTime("09:00");
      setEndTime("17:00");
      setSlotDuration(60);
      setBreakStart("12:00");
      setBreakEnd("13:00");
    }
  }, [schedule, open]);

  function toggleDay(day: string) {
    setDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      name,
      semester,
      timeConfig: {
        days,
        startTime,
        endTime,
        slotDuration,
        breakStart,
        breakEnd,
      },
    };

    try {
      const res = await fetch(
        isEdit ? `/api/schedules/${schedule.id}` : "/api/schedules",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      toast.success(isEdit ? "Schedule updated" : "Schedule created");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Error saving schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Schedule" : "New Schedule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fall 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Semester 3"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days</Label>
            <div className="flex gap-4">
              {ALL_DAYS.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={days.includes(day)}
                    onCheckedChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slot (min)</Label>
              <Input
                type="number"
                min={30}
                step={15}
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Break Start</Label>
              <Input
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Break End</Label>
              <Input
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
