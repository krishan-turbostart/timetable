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
import { toast } from "sonner";

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: {
    id: string;
    code: string;
    name: string;
    type: string;
    hoursPerWeek: number;
    sessionsPerWeek: number;
  } | null;
  onSuccess: () => void;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: CourseFormDialogProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("LECTURE");
  const [hoursPerWeek, setHoursPerWeek] = useState(3);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sectionCount, setSectionCount] = useState(2);
  const [labGroupsPerSection, setLabGroupsPerSection] = useState(2);
  const [loading, setLoading] = useState(false);

  const isEdit = !!course;

  useEffect(() => {
    if (course) {
      setCode(course.code);
      setName(course.name);
      setType(course.type);
      setHoursPerWeek(course.hoursPerWeek);
      setSessionsPerWeek(course.sessionsPerWeek);
    } else {
      setCode("");
      setName("");
      setType("LECTURE");
      setHoursPerWeek(3);
      setSessionsPerWeek(3);
      setSectionCount(2);
      setLabGroupsPerSection(2);
    }
  }, [course, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const sections = Array.from({ length: sectionCount }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    const body = {
      code,
      name,
      type,
      hoursPerWeek,
      sessionsPerWeek,
      sections,
      labGroupsPerSection: type === "LAB" ? labGroupsPerSection : 0,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/courses/${course.id}` : "/api/courses",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      toast.success(isEdit ? "Course updated" : "Course created");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Error saving course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Add Course"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS301"
                required
                disabled={isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Data Structures"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LECTURE">Lecture</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours/Week</Label>
              <Input
                type="number"
                min={1}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sessions/Week</Label>
              <Input
                type="number"
                min={1}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                required
              />
            </div>
          </div>
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label>Number of Sections</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={sectionCount}
                  onChange={(e) => setSectionCount(Number(e.target.value))}
                />
              </div>
              {type === "LAB" && (
                <div className="space-y-2">
                  <Label>Lab Groups per Section</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={labGroupsPerSection}
                    onChange={(e) =>
                      setLabGroupsPerSection(Number(e.target.value))
                    }
                  />
                </div>
              )}
            </>
          )}
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
