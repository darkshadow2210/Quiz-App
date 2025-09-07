import { LeaderboardEntry } from "@shared/api";

import { useState } from "react";

export function Leaderboard({ entries, compact }: { entries: LeaderboardEntry[]; compact?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Leaderboard</h3>
        <button className="text-sm text-muted-foreground" onClick={() => setOpen((s) => !s)}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <ol className="space-y-2" role="list" aria-live="polite">
          {entries.map((e, i) => (
            <li key={e.playerId} className="flex items-center justify-between text-sm animate-pop">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-semibold">{i + 1}</span>
                <span className="truncate max-w-[8rem] sm:max-w-[20rem]">{e.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {!compact && <span className="text-muted-foreground">{e.correctCount}✓</span>}
                <span className="font-semibold">{e.score}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
