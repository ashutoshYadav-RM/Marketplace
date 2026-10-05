"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DAY_LABELS, type DayHours } from "@/lib/opening-hours";
import { setLocationHours } from "../service/actions";

export function HoursEditor({ locationId, initial }: { locationId: string; initial: DayHours[] }) {
  const [days, setDays] = useState<DayHours[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(dayOfWeek: number, patch: Partial<DayHours>) {
    setSaved(false);
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  return (
    <Card className="divide-y divide-border">
      {days.map((day) => (
        <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-3 p-3">
          <span className="w-24 shrink-0 text-sm font-medium text-foreground">{DAY_LABELS[day.dayOfWeek]}</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={!day.isClosed}
              onChange={(e) => update(day.dayOfWeek, { isClosed: !e.target.checked })}
            />
            Open
          </label>
          {!day.isClosed && (
            <>
              <Input
                type="time"
                value={day.openTime?.slice(0, 5) ?? ""}
                onChange={(e) => update(day.dayOfWeek, { openTime: e.target.value })}
                className="h-9 w-28"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="time"
                value={day.closeTime?.slice(0, 5) ?? ""}
                onChange={(e) => update(day.dayOfWeek, { closeTime: e.target.value })}
                className="h-9 w-28"
              />
            </>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3 p-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await setLocationHours({
                locationId,
                days: days.map((d) => ({
                  dayOfWeek: d.dayOfWeek,
                  isClosed: d.isClosed,
                  openTime: d.openTime ?? undefined,
                  closeTime: d.closeTime ?? undefined,
                })),
              });
              if (!result.ok) return setError(result.error);
              setSaved(true);
            });
          }}
        >
          Save hours
        </Button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </Card>
  );
}
