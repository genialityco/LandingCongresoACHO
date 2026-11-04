"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function remaining(target: number): Parts | null {
  const ms = target - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * Cuenta regresiva. Se calcula solo en el navegador (tras montar) para no generar
 * diferencias de hidratación con el HTML cacheado del servidor.
 */
export function CountdownClient({
  targetIso,
  labels,
  showDays,
  showSeconds,
  finishedText,
}: {
  targetIso: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  showDays: boolean;
  showSeconds: boolean;
  finishedText: string;
}) {
  const target = Date.parse(targetIso);
  const [parts, setParts] = useState<Parts | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setParts(remaining(target));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!targetIso || Number.isNaN(target)) {
    return <p className="lp-countdown-finished">Configura la fecha del contador</p>;
  }
  if (parts === null) {
    return finishedText ? <p className="lp-countdown-finished">{finishedText}</p> : null;
  }

  const units: { key: keyof Parts; label: string }[] = [
    ...(showDays ? [{ key: "days" as const, label: labels.days }] : []),
    { key: "hours", label: labels.hours },
    { key: "minutes", label: labels.minutes },
    ...(showSeconds ? [{ key: "seconds" as const, label: labels.seconds }] : []),
  ];
  // Sin días, las horas acumulan el total.
  const value = (k: keyof Parts) => {
    if (!parts) return "--";
    const v = k === "hours" && !showDays ? parts.days * 24 + parts.hours : parts[k];
    return String(v).padStart(2, "0");
  };

  return (
    <div className="lp-countdown-units" role="timer" aria-live="off" aria-label={parts ? `Faltan ${parts.days} días, ${parts.hours} horas y ${parts.minutes} minutos` : "Cargando contador"}>
      {units.map((u) => (
        <div key={u.key} className="lp-countdown-unit" data-unit={u.key}>
          <span className="lp-countdown-value">{value(u.key)}</span>
          <span className="lp-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
