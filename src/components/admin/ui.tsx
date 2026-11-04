"use client";

import { createContext, useCallback, useContext, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FormRow({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ColorInput({ value, onChange, id, allowEmpty = true }: { value?: string; onChange: (v: string) => void; id?: string; allowEmpty?: boolean }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value ?? "");
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        aria-label="Selector de color"
        className="h-8 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        value={isHex ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        id={id}
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 font-mono text-xs outline-none focus-visible:border-ring"
        value={value ?? ""}
        placeholder={allowEmpty ? "heredado" : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ---------- Confirmación ----------
type ConfirmOptions = { title: string; description?: ReactNode; confirmLabel?: string; destructive?: boolean };
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description ? <AlertDialogDescription render={<div />}>{state.description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant={state?.destructive ? "destructive" : "default"} onClick={() => close(true)}>
              {state?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm requiere ConfirmProvider");
  return ctx;
}

export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied" || code === "storage/unauthorized") return "No tienes permisos para esta acción.";
  if (code === "unavailable") return "Sin conexión con Firebase. Revisa tu red o los emuladores.";
  return (e as Error)?.message || "Error inesperado";
}

export function formatDate(ts: unknown): string {
  if (!ts) return "—";
  const d =
    ts instanceof Date
      ? ts
      : typeof (ts as { toDate?: () => Date }).toDate === "function"
        ? (ts as { toDate: () => Date }).toDate()
        : typeof (ts as { seconds?: number }).seconds === "number"
          ? new Date((ts as { seconds: number }).seconds * 1000)
          : null;
  return d ? d.toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
