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

interface Section {
  id: string;
  name: string;
  course: { code: string; name: string };
}

interface BatchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: {
    id: string;
    name: string;
    studentCount: number;
    batchSections: { section: Section }[];
  } | null;
  sections: Section[];
  onSuccess: () => void;
}

export function BatchFormDialog({
  open,
  onOpenChange,
  batch,
  sections,
  onSuccess,
}: BatchFormDialogProps) {
  const [name, setName] = useState("");
  const [studentCount, setStudentCount] = useState(60);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isEdit = !!batch;

  useEffect(() => {
    if (batch) {
      setName(batch.name);
      setStudentCount(batch.studentCount);
      setSelectedSections(batch.batchSections.map((bs) => bs.section.id));
    } else {
      setName("");
      setStudentCount(60);
      setSelectedSections([]);
    }
  }, [batch, open]);

  function toggleSection(sectionId: string) {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = { name, studentCount, sectionIds: selectedSections };

    try {
      const res = await fetch(
        isEdit ? `/api/batches/${batch.id}` : "/api/batches",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save");
      toast.success(isEdit ? "Batch updated" : "Batch created");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Error saving batch");
    } finally {
      setLoading(false);
    }
  }

  // Group sections by course
  const grouped = sections.reduce(
    (acc, sec) => {
      const key = sec.course.code;
      if (!acc[key]) acc[key] = { courseName: sec.course.name, sections: [] };
      acc[key].sections.push(sec);
      return acc;
    },
    {} as Record<string, { courseName: string; sections: Section[] }>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Batch" : "Add Batch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Batch Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CSE Sem-3A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Student Count</Label>
              <Input
                type="number"
                min={1}
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enrolled Sections</Label>
            <div className="rounded-md border p-3 space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(grouped).map(([code, { courseName, sections: secs }]) => (
                <div key={code}>
                  <p className="text-sm font-medium mb-1">
                    {code} - {courseName}
                  </p>
                  <div className="flex gap-4 ml-4">
                    {secs.map((sec) => (
                      <label
                        key={sec.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedSections.includes(sec.id)}
                          onCheckedChange={() => toggleSection(sec.id)}
                        />
                        Section {sec.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
