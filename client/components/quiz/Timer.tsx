import { useEffect, useMemo, useRef, useState } from "react";

export function Timer({ deadline }: { deadline?: number }) {
  const [now, setNow] = useState(Date.now());
  const initial = useRef<number>(0);

  useEffect(() => {
    if (deadline) initial.current = Math.max(1, deadline - Date.now());
  }, [deadline]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const msLeft = Math.max(0, (deadline || 0) - now);
  const remaining = Math.ceil(msLeft / 1000);
  const pct = useMemo(() => {
    if (!deadline || initial.current <= 0) return 0;
    return Math.max(0, Math.min(100, (msLeft / initial.current) * 100));
  }, [msLeft, deadline]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
        <span>Time</span>
        <span>{remaining}s</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div className="h-full brand-gradient" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
