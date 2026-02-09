"use client";

import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  day: string;
  slotIndex: number;
  duration: number;
  courseCode: string;
  courseName: string;
  startTime: string;
  endTime: string;
  faculty: { name: string };
  room: { name: string };
  batch: { name: string };
}

interface TimetableGridProps {
  assignments: Assignment[];
  days: string[];
  slots: { index: number; startTime: string; endTime: string }[];
  viewType: "batch" | "faculty" | "room";
}

const COLORS = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-amber-100 border-amber-300 text-amber-900",
];

export function TimetableGrid({
  assignments,
  days,
  slots,
  viewType,
}: TimetableGridProps) {
  // Color map by course code
  const courseColors = new Map<string, string>();
  const uniqueCourses = [...new Set(assignments.map((a) => a.courseCode))];
  uniqueCourses.forEach((code, i) => {
    courseColors.set(code, COLORS[i % COLORS.length]);
  });

  function getAssignment(day: string, slotIndex: number) {
    return assignments.filter(
      (a) =>
        a.day === day &&
        a.slotIndex <= slotIndex &&
        a.slotIndex + a.duration > slotIndex
    );
  }

  function isStartSlot(a: Assignment, slotIndex: number) {
    return a.slotIndex === slotIndex;
  }

  // Track which cells are covered by multi-slot assignments
  const coveredCells = new Set<string>();
  for (const a of assignments) {
    for (let d = 1; d < a.duration; d++) {
      coveredCells.add(`${a.day}-${a.slotIndex + d}`);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 bg-muted w-20">Time</th>
            {days.map((day) => (
              <th key={day} className="border p-2 bg-muted min-w-[160px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.index}>
              <td className="border p-2 text-center text-muted-foreground font-medium whitespace-nowrap">
                {slot.startTime}
                <br />
                <span className="text-xs">{slot.endTime}</span>
              </td>
              {days.map((day) => {
                const cellKey = `${day}-${slot.index}`;
                if (coveredCells.has(cellKey)) return null;

                const cellAssignments = getAssignment(day, slot.index);
                const startAssignments = cellAssignments.filter((a) =>
                  isStartSlot(a, slot.index)
                );

                if (startAssignments.length === 0) {
                  return <td key={cellKey} className="border p-1" />;
                }

                // Use first assignment for rowSpan
                const primary = startAssignments[0];

                return (
                  <td
                    key={cellKey}
                    rowSpan={primary.duration}
                    className="border p-0"
                  >
                    <div className="flex flex-col gap-1 p-1 h-full">
                      {startAssignments.map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            "rounded-md border p-2 text-xs h-full",
                            courseColors.get(a.courseCode) ?? COLORS[0]
                          )}
                        >
                          <p className="font-bold">{a.courseCode}</p>
                          <p className="truncate">{a.courseName}</p>
                          {viewType !== "faculty" && (
                            <p className="mt-1 opacity-75">{a.faculty.name}</p>
                          )}
                          {viewType !== "room" && (
                            <p className="opacity-75">{a.room.name}</p>
                          )}
                          {viewType !== "batch" && (
                            <p className="opacity-75">{a.batch.name}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
