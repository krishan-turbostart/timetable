"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { CourseFormDialog } from "@/components/course-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCourses } from "@/hooks/use-courses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  labGroups: { id: string; name: string }[];
}

interface FacultyCourse {
  faculty: { id: string; name: string };
}

interface Course {
  id: string;
  code: string;
  name: string;
  type: string;
  hoursPerWeek: number;
  sessionsPerWeek: number;
  sections: Section[];
  facultyCourses: FacultyCourse[];
}

export default function CoursesPage() {
  const { courses, isLoading, mutate } = useCourses();
  const [formOpen, setFormOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteCourse) return;
    setDeleting(true);
    try {
      await fetch(`/api/courses/${deleteCourse.id}`, { method: "DELETE" });
      toast.success("Course deleted");
      mutate();
    } catch {
      toast.error("Error deleting course");
    } finally {
      setDeleting(false);
      setDeleteCourse(null);
    }
  }

  const columns: ColumnDef<Course>[] = [
    { accessorKey: "code", header: "Code" },
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "LAB" ? "secondary" : "default"}>
          {row.original.type}
        </Badge>
      ),
    },
    { accessorKey: "hoursPerWeek", header: "Hrs/Wk" },
    { accessorKey: "sessionsPerWeek", header: "Sessions/Wk" },
    {
      id: "sections",
      header: "Sections",
      cell: ({ row }) =>
        row.original.sections.map((s) => s.name).join(", "),
    },
    {
      id: "faculty",
      header: "Faculty",
      cell: ({ row }) =>
        row.original.facultyCourses
          .map((fc) => fc.faculty.name)
          .join(", ") || "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditCourse(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteCourse(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Manage courses, sections, and lab groups"
        actionLabel="Add Course"
        onAction={() => {
          setEditCourse(null);
          setFormOpen(true);
        }}
      />
      <DataTable columns={columns} data={courses} />

      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editCourse}
        onSuccess={() => mutate()}
      />
      <ConfirmDialog
        open={!!deleteCourse}
        onOpenChange={(open) => !open && setDeleteCourse(null)}
        title="Delete Course"
        description={`Are you sure you want to delete "${deleteCourse?.code} - ${deleteCourse?.name}"? All sections and lab groups will be deleted.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
