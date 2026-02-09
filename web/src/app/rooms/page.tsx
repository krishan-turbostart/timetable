"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { RoomFormDialog } from "@/components/room-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRooms } from "@/hooks/use-rooms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
}

export default function RoomsPage() {
  const { rooms, isLoading, mutate } = useRooms();
  const [formOpen, setFormOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteRoom) return;
    setDeleting(true);
    try {
      await fetch(`/api/rooms/${deleteRoom.id}`, { method: "DELETE" });
      toast.success("Room deleted");
      mutate();
    } catch {
      toast.error("Error deleting room");
    } finally {
      setDeleting(false);
      setDeleteRoom(null);
    }
  }

  const columns: ColumnDef<Room>[] = [
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
    { accessorKey: "capacity", header: "Capacity" },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditRoom(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteRoom(row.original)}
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
        title="Rooms"
        description="Manage lecture halls and labs"
        actionLabel="Add Room"
        onAction={() => {
          setEditRoom(null);
          setFormOpen(true);
        }}
      />
      <DataTable columns={columns} data={rooms} />

      <RoomFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        room={editRoom}
        onSuccess={() => mutate()}
      />
      <ConfirmDialog
        open={!!deleteRoom}
        onOpenChange={(open) => !open && setDeleteRoom(null)}
        title="Delete Room"
        description={`Are you sure you want to delete "${deleteRoom?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
