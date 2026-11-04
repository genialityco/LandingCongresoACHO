"use client";

import { createUsePuck } from "@puckeditor/core";
import { useCallback, useState, type ReactNode } from "react";
import { ChevronRight, Monitor, Smartphone, Tablet } from "lucide-react";
import { BREAKPOINTS, type Device } from "@/lib/model/types";
import { cn } from "@/lib/utils";

const usePuck = createUsePuck();

export const VIEWPORT_WIDTH: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 375 };

function deviceForWidth(w: number | "100%"): Device {
  if (w === "100%") return "desktop";
  if (w <= BREAKPOINTS.mobile) return "mobile";
  if (w <= BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

/**
 * Dispositivo activo sincronizado con el viewport del lienzo de Puck: al elegir "Tablet"
 * en un campo, el lienzo cambia a 768px y viceversa.
 */
export function useEditorDevice(): [Device, (d: Device) => void] {
  const width = usePuck((s) => s.appState.ui.viewports.current.width);
  const dispatch = usePuck((s) => s.dispatch);
  const device = deviceForWidth(width);
  const setDevice = useCallback(
    (d: Device) =>
      dispatch({
        type: "setUi",
        ui: (prev) => ({ viewports: { ...prev.viewports, current: { ...prev.viewports.current, width: VIEWPORT_WIDTH[d] } } }),
        recordHistory: false,
      }),
    [dispatch],
  );
  return [device, setDevice];
}

const DEVICE_META: Record<Device, { label: string; Icon: typeof Monitor }> = {
  desktop: { label: "Desktop", Icon: Monitor },
  tablet: { label: "Tablet", Icon: Tablet },
  mobile: { label: "Mobile", Icon: Smartphone },
};

export function DeviceTabs({ device, onChange, counts }: { device: Device; onChange: (d: Device) => void; counts?: Partial<Record<Device, number>> }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 rounded-md bg-muted p-0.5" role="tablist" aria-label="Dispositivo">
      {(Object.keys(DEVICE_META) as Device[]).map((d) => {
        const { label, Icon } = DEVICE_META[d];
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={device === d}
            title={label}
            onClick={() => onChange(d)}
            className={cn(
              "relative flex items-center justify-center gap-1 rounded px-1 py-1 text-[11px] text-muted-foreground transition",
              device === d && "bg-background text-foreground shadow-sm",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {counts?.[d] ? <span className="absolute -top-1 -right-0.5 size-1.5 rounded-full bg-primary" aria-label="con cambios" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children, defaultOpen }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-t first:border-t-0">
      <button type="button" className="flex w-full items-center gap-1 py-2 text-xs font-semibold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        {title}
      </button>
      {open ? <div className="space-y-2.5 pb-3">{children}</div> : null}
    </div>
  );
}

export function Row({ label, children, inherited }: { label: string; children: ReactNode; inherited?: boolean }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className={cn("truncate text-[11px] text-muted-foreground", inherited === false && "font-medium text-primary")}>{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const UNITS = ["px", "%", "rem", "em", "vw", "vh", "auto"] as const;
const LENGTH_RE = /^(-?\d*\.?\d+)\s*(px|%|rem|em|vw|vh)$/;

/** Número + unidad. Vacío significa "heredar". */
export function LengthInput({
  value,
  onChange,
  placeholder,
  units = UNITS as unknown as string[],
  readOnly,
  ariaLabel,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  units?: string[];
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  const m = value ? value.match(LENGTH_RE) : null;
  const isKeyword = value && !m;
  const [unit, setUnit] = useState<string>(m?.[2] ?? (value === "auto" ? "auto" : "px"));
  const num = m?.[1] ?? "";
  const phMatch = placeholder?.match(LENGTH_RE);
  return (
    <div className="flex h-7 overflow-hidden rounded-md border border-input bg-background text-xs focus-within:border-ring">
      {isKeyword && value !== "auto" ? (
        <input
          className="w-full min-w-0 bg-transparent px-1.5 outline-none"
          value={value}
          readOnly={readOnly}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      ) : (
        <input
          type="number"
          className="w-full min-w-0 bg-transparent px-1.5 outline-none disabled:opacity-40"
          value={unit === "auto" ? "" : num}
          disabled={unit === "auto" || readOnly}
          placeholder={unit === "auto" ? "auto" : phMatch ? phMatch[1] : placeholder ?? ""}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value === "" ? undefined : `${e.target.value}${unit === "auto" ? "px" : unit}`)}
        />
      )}
      <select
        className="border-l border-input bg-muted/60 px-0.5 text-[10px] outline-none"
        value={value === "auto" ? "auto" : unit}
        disabled={readOnly}
        aria-label="Unidad"
        onChange={(e) => {
          const u = e.target.value;
          setUnit(u);
          if (u === "auto") onChange("auto");
          else if (num) onChange(`${num}${u}`);
          else if (value === "auto") onChange(undefined);
        }}
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  allowEmpty = true,
  readOnly,
}: {
  value?: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T | undefined) => void;
  allowEmpty?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          disabled={readOnly}
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value && allowEmpty ? undefined : o.value)}
          className={cn(
            "flex flex-1 items-center justify-center rounded px-1 py-0.5 text-[11px] text-muted-foreground",
            value === o.value && "bg-background text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SmallSelect({
  value,
  onChange,
  options,
  placeholder,
  readOnly,
  ariaLabel,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select
      className="h-7 w-full rounded-md border border-input bg-background px-1 text-xs outline-none focus:border-ring"
      value={value ?? ""}
      disabled={readOnly}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">{placeholder ?? "Heredado"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorControl({ value, onChange, placeholder, readOnly }: { value?: string; onChange: (v: string | undefined) => void; placeholder?: string; readOnly?: boolean }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value ?? "");
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        aria-label="Selector de color"
        disabled={readOnly}
        className="h-7 w-8 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
        value={isHex ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className="h-7 w-full min-w-0 rounded-md border border-input bg-background px-1.5 font-mono text-[11px] outline-none focus:border-ring"
        value={value ?? ""}
        placeholder={placeholder ?? "heredado"}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value || undefined)}
        aria-label="Color"
      />
    </div>
  );
}

export function TextControl({ value, onChange, placeholder, readOnly }: { value?: string; onChange: (v: string | undefined) => void; placeholder?: string; readOnly?: boolean }) {
  return (
    <input
      className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:border-ring"
      value={value ?? ""}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value || undefined)}
    />
  );
}

export function FieldShell({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label ? <div className="text-xs font-semibold">{label}</div> : null}
      {children}
    </div>
  );
}

/** Elimina claves vacías para no guardar ruido en Firestore. */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === "" || v === null) continue;
    if (typeof v === "object" && !Array.isArray(v)) {
      const c = compact(v as Record<string, unknown>);
      if (Object.keys(c).length) out[k] = c;
    } else out[k] = v;
  }
  return out as T;
}
