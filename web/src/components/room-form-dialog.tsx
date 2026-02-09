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

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: {
    id: string;
    name: string;
    type: string;
    capacity: number;
  } | null;
  onSuccess: () => void;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const ALL_SLOTS = [0, 1, 2, 4, 5, 6]; // skip slot 3 (lunch)

export function RoomFormDialog({
  open,
  onOpenChange,
  room,
  onSuccess,
}: RoomFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("LECTURE");
  const [capacity, setCapacity] = useState(60);
  const [loading, setLoading] = useState(false);

  const isEdit = !!room;

  useEffect(() => {
    if (room) {
      setName(room.name);
      setType(room.type);
      setCapacity(room.capacity);
    } else {
      setName("");
      setType("LECTURE");
      setCapacity(60);
    }
  }, [room, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Default full availability
    const availability: Record<string, number[]> = {};
    for (const d of DAYS) availability[d] = ALL_SLOTS;

    const body = { name, type, capacity, availability };

    try {
      const res = await fetch(
        isEdit ? `/api/rooms/${room.id}` : "/api/rooms",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to save room");
      toast.success(isEdit ? "Room updated" : "Room created");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Error saving room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Room" : "Add Room"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="LH-101"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LECTURE">Lecture</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
            />
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
