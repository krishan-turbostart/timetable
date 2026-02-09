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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Course {
  id: string;
  code: string;
  name: string;
}

interface FacultyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faculty?: {
    id: string;
    name: string;
    email: string;
    type: string;
    maxHours: number;
    availability: Record<string, number[]> | null;
    facultyCourses: { course: Course }[];
  } | null;
  courses: Course[];
  onSuccess: () => void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const ALL_SLOTS = [0, 1, 2, 4, 5, 6];
const SLOT_LABELS = ["9-10", "10-11", "11-12", "13-14", "14-15", "15-16"];

export function FacultyFormDialog({
  open,
  onOpenChange,
  faculty,
  courses,
  onSuccess,
}: FacultyFormDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("FULLTIME");
  const [maxHours, setMaxHours] = useState(20);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);

  const isEdit = !!faculty;

  useEffect(() => {
    if (faculty) {
      setName(faculty.name);
      setEmail(faculty.email);
      setType(faculty.type);
      setMaxHours(faculty.maxHours);
      setSelectedCourses(faculty.facultyCourses.map((fc) => fc.course.id));
      setAvailability(
        (faculty.availability as Record<string, number[]>) ??
          Object.fromEntries(DAYS.map((d) => [d, [...ALL_SLOTS]]))
      );
    } else {
      setName("");
      setEmail("");
      setType("FULLTIME");
      setMaxHours(20);
      setSelectedCourses([]);
      setAvailability(Object.fromEntries(DAYS.map((d) => [d, [...ALL_SLOTS]])));
    }
  }, [faculty, open]);

  function toggleSlot(day: string, slot: number) {
    setAvailability((prev) => {
      const daySlots = prev[day] ?? [];
      const next = daySlots.includes(slot)
        ? daySlots.filter((s) => s !== slot)
        : [...daySlots, slot].sort((a, b) => a - b);
      return { ...prev, [day]: next };
    });
  }

  function toggleCourse(courseId: string) {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      name,
      email,
      type,
      maxHours,
      availability,
      courseIds: selectedCourses,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/faculty/${faculty.id}` : "/api/faculty",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      toast.success(isEdit ? "Faculty updated" : "Faculty created");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Error saving faculty");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Faculty" : "Add Faculty"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@univ.edu"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULLTIME">Full-time</SelectItem>
                  <SelectItem value="PARTTIME">Part-time</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Hours/Week</Label>
              <Input
                type="number"
                min={1}
                value={maxHours}
                onChange={(e) => setMaxHours(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Qualified Courses</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedCourses.includes(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                  />
                  {c.code} - {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Availability</Label>
            <div className="rounded-md border p-3 overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th className="pr-3 text-left">Day</th>
                    {SLOT_LABELS.map((label, i) => (
                      <th key={i} className="px-2 text-center">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td className="pr-3 font-medium">{day}</td>
                      {ALL_SLOTS.map((slot, i) => (
                        <td key={slot} className="px-2 text-center">
                          <Checkbox
                            checked={(availability[day] ?? []).includes(slot)}
                            onCheckedChange={() => toggleSlot(day, slot)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
