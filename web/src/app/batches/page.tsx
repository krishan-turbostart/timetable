"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { BatchFormDialog } from "@/components/batch-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useBatches } from "@/hooks/use-batches";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetcher } from "@/lib/fetcher";

interface Section {
  id: string;
  name: string;
  course: { code: string; name: string };
}

interface BatchSection {
  section: Section;
}

interface Batch {
  id: string;
  name: string;
  studentCount: number;
  batchSections: BatchSection[];
}

export default function BatchesPage() {
  const { batches, isLoading, mutate } = useBatches();
  const [formOpen, setFormOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [deleteBatch, setDeleteBatch] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [allSections, setAllSections] = useState<Section[]>([]);

  useEffect(() => {
    fetcher("/api/courses").then((courses: { sections: { id: string; name: string }[]; code: string; name: string }[]) => {
      const secs: Section[] = [];
      for (const c of courses) {
        for (const s of c.sections) {
          secs.push({ id: s.id, name: s.name, course: { code: c.code, name: c.name } });
        }
      }
      setAllSections(secs);
    });
  }, []);

  async function handleDelete() {
    if (!deleteBatch) return;
    setDeleting(true);
    try {
      await fetch(`/api/batches/${deleteBatch.id}`, { method: "DELETE" });
      toast.success("Batch deleted");
      mutate();
    } catch {
      toast.error("Error deleting batch");
    } finally {
      setDeleting(false);
      setDeleteBatch(null);
    }
  }

  const columns: ColumnDef<Batch>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "studentCount", header: "Students" },
    {
      id: "sections",
      header: "Enrolled Sections",
      cell: ({ row }) =>
        row.original.batchSections
          .map((bs) => `${bs.section.course.code}-${bs.section.name}`)
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
              setEditBatch(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteBatch(row.original)}
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
        title="Batches"
        description="Manage student batches and their section enrollments"
        actionLabel="Add Batch"
        onAction={() => {
          setEditBatch(null);
          setFormOpen(true);
        }}
      />
      <DataTable columns={columns} data={batches} />

      <BatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        batch={editBatch}
        sections={allSections}
        onSuccess={() => mutate()}
      />
      <ConfirmDialog
        open={!!deleteBatch}
        onOpenChange={(open) => !open && setDeleteBatch(null)}
        title="Delete Batch"
        description={`Are you sure you want to delete "${deleteBatch?.name}"?`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
