"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SolverPanelProps {
  scheduleId: string;
  onSolved: () => void;
}

export function SolverPanel({ scheduleId, onSolved }: SolverPanelProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    solveTimeMs?: number;
    totalAssignments?: number;
    diagnostics?: { hardScore?: number; softScore?: number; reasons?: string[] };
  } | null>(null);

  async function handleSolve() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Solver failed");
      setResult(data);
      toast.success("Solver completed successfully!");
      onSolved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Solver failed";
      toast.error(message);
      setResult({ status: "FAILED" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Solver</span>
          <Button onClick={handleSolve} disabled={running}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {running ? "Solving..." : "Run Solver"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {running && (
          <p className="text-sm text-muted-foreground">
            Running constraint solver... This may take a few seconds.
          </p>
        )}
        {result && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={
                  result.status === "SUCCESS"
                    ? "text-green-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {result.status}
              </span>
            </div>
            {result.solveTimeMs !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solve Time</span>
                <span>{result.solveTimeMs}ms</span>
              </div>
            )}
            {result.totalAssignments !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assignments</span>
                <span>{result.totalAssignments}</span>
              </div>
            )}
            {result.diagnostics?.reasons && result.diagnostics.reasons.length > 0 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1">Diagnostics:</p>
                <ul className="list-disc list-inside space-y-1">
                  {result.diagnostics.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {!running && !result && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Run Solver&quot; to generate an optimized timetable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
