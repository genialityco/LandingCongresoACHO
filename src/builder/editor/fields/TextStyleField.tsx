"use client";

import { AlignCenter, AlignLeft, AlignRight, CaseUpper } from "lucide-react";
import type { TextStyle } from "../../blocks/advanced";

const SIZES = ["12px", "14px", "16px", "18px", "20px", "22px", "24px", "28px", "32px", "36px", "40px", "48px", "56px", "64px"];

/** Estilo compacto de un texto: color, tamaño, alineación y mayúsculas. Vacío = tema. */
export function TextStyleField({ label, value, onChange, readOnly }: { label: string; value?: TextStyle; onChange: (v: TextStyle) => void; readOnly?: boolean }) {
  const v = value ?? {};
  const set = (patch: Partial<TextStyle>) => {
    const next: TextStyle = { ...v, ...patch };
    for (const k of Object.keys(next) as (keyof TextStyle)[]) if (next[k] === undefined || next[k] === "" || next[k] === false) delete next[k];
    onChange(next);
  };
  const isHex = /^#[0-9a-f]{6}$/i.test(v.color ?? "");
  const alignBtn = (a: "left" | "center" | "right", Icon: typeof AlignLeft, title: string) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={v.align === a}
      disabled={readOnly}
      onClick={() => set({ align: v.align === a ? undefined : a })}
      className={`grid size-7 place-items-center rounded ${v.align === a ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
    >
      <Icon className="size-3.5" />
    </button>
  );
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-1">
        <label className="relative" title="Color">
          <input
            type="color"
            className="h-7 w-8 cursor-pointer rounded border bg-transparent p-0.5"
            value={isHex ? v.color : "#000000"}
            disabled={readOnly}
            onChange={(e) => set({ color: e.target.value })}
            aria-label={`${label}: color`}
          />
          {v.color ? null : <span className="pointer-events-none absolute inset-0 grid place-items-center text-[9px] text-muted-foreground">tema</span>}
        </label>
        <select
          className="h-7 rounded-md border bg-background px-1 text-xs"
          value={v.size ?? ""}
          disabled={readOnly}
          onChange={(e) => set({ size: e.target.value || undefined })}
          aria-label={`${label}: tamaño`}
        >
          <option value="">Tamaño</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex rounded-md bg-muted p-0.5">
          {alignBtn("left", AlignLeft, "Izquierda")}
          {alignBtn("center", AlignCenter, "Centro")}
          {alignBtn("right", AlignRight, "Derecha")}
        </div>
        <button
          type="button"
          title="Mayúsculas"
          aria-label="Mayúsculas"
          aria-pressed={!!v.uppercase}
          disabled={readOnly}
          onClick={() => set({ uppercase: !v.uppercase })}
          className={`grid size-7 place-items-center rounded-md border ${v.uppercase ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <CaseUpper className="size-4" />
        </button>
        {Object.keys(v).length && !readOnly ? (
          <button type="button" className="text-[11px] text-muted-foreground underline" onClick={() => onChange({})}>
            Restablecer
          </button>
        ) : null}
      </div>
    </div>
  );
}
