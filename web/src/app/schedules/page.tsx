"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { ScheduleFormDialog } from "@/components/schedule-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSchedules } from "@/hooks/use-schedules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  semester: string;
  status: string;
  _count: { assignments: number };
  timeConfig?: {
    days: string[];
    startTime: string;
    endTime: string;
    slotDuration: number;
    breakStart: string;
    breakEnd: string;
  } | null;
}

export default function SchedulesPage() {
  const router = useRouter();
  const { schedules, isLoading, mutate } = useSchedules();
  const [formOpen, setFormOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteSchedule) return;
    setDeleting(true);
    try {
      await fetch(`/api/schedules/${deleteSchedule.id}`, { method: "DELETE" });
      toast.success("Schedule deleted");
      mutate();
    } catch {
      toast.error("Error deleting schedule");
    } finally {
      setDeleting(false);
      setDeleteSchedule(null);
    }
  }

  const columns: ColumnDef<Schedule>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "semester", header: "Semester" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge
            variant={
              s === "SOLVED" ? "default" : s === "FINALIZED" ? "secondary" : "outline"
            }
          >
            {s}
          </Badge>
        );
      },
    },
    {
      id: "assignments",
      header: "Assignments",
      cell: ({ row }) => row.original._count.assignments,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/schedules/${row.original.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditSchedule(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteSchedule(row.original)}
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
        title="Schedules"
        description="Manage timetable schedules"
        actionLabel="New Schedule"
        onAction={() => {
          setEditSchedule(null);
          setFormOpen(true);
        }}
      />
      <DataTable columns={columns} data={schedules} />

      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={editSchedule}
        onSuccess={() => mutate()}
      />
      <ConfirmDialog
        open={!!deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
        title="Delete Schedule"
        description={`Are you sure you want to delete "${deleteSchedule?.name}"? All assignments will be lost.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
