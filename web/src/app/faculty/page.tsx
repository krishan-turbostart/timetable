"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { FacultyFormDialog } from "@/components/faculty-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFaculty } from "@/hooks/use-faculty";
import { useCourses } from "@/hooks/use-courses";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FacultyCourse {
  course: { id: string; code: string; name: string };
}

interface Faculty {
  id: string;
  name: string;
  email: string;
  type: string;
  maxHours: number;
  availability: Record<string, number[]> | null;
  facultyCourses: FacultyCourse[];
}

export default function FacultyPage() {
  const { faculty, isLoading, mutate } = useFaculty();
  const { courses } = useCourses();
  const [formOpen, setFormOpen] = useState(false);
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);
  const [deleteFac, setDeleteFac] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteFac) return;
    setDeleting(true);
    try {
      await fetch(`/api/faculty/${deleteFac.id}`, { method: "DELETE" });
      toast.success("Faculty deleted");
      mutate();
    } catch {
      toast.error("Error deleting faculty");
    } finally {
      setDeleting(false);
      setDeleteFac(null);
    }
  }

  const columns: ColumnDef<Faculty>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const t = row.original.type;
        return (
          <Badge variant={t === "FULLTIME" ? "default" : "secondary"}>
            {t}
          </Badge>
        );
      },
    },
    { accessorKey: "maxHours", header: "Max Hrs" },
    {
      id: "courses",
      header: "Courses",
      cell: ({ row }) =>
        row.original.facultyCourses
          .map((fc) => fc.course.code)
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
              setEditFaculty(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteFac(row.original)}
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
        title="Faculty"
        description="Manage faculty members and their qualifications"
        actionLabel="Add Faculty"
        onAction={() => {
          setEditFaculty(null);
          setFormOpen(true);
        }}
      />
      <DataTable columns={columns} data={faculty} />

      <FacultyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        faculty={editFaculty}
        courses={courses}
        onSuccess={() => mutate()}
      />
      <ConfirmDialog
        open={!!deleteFac}
        onOpenChange={(open) => !open && setDeleteFac(null)}
        title="Delete Faculty"
        description={`Are you sure you want to delete "${deleteFac?.name}"?`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
