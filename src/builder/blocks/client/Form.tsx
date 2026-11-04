"use client";

import { useState, type FormEvent } from "react";

export type FormFieldDef = {
  label: string;
  name: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: string;
};

export function fieldKey(f: { name?: string; label?: string }) {
  return (f.name || f.label || "").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40) || "campo";
}

/** Envía a Firestore (formSubmissions). Las reglas validan la forma del documento. */
export function FormClient({
  formId,
  fields,
  submitLabel,
  successMessage,
  buttonClass,
  editing,
}: {
  formId: string;
  fields: FormFieldDef[];
  submitLabel: string;
  successMessage: string;
  buttonClass: string;
  editing?: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editing) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    // Honeypot anti-spam básico
    if (form.get("_website")) return setState("done");
    const values: Record<string, string> = {};
    for (const f of fields.slice(0, 20)) {
      const key = fieldKey(f);
      values[key] = String(form.get(key) ?? "").slice(0, 2000);
    }
    setState("sending");
    try {
      const [{ db }, { addDoc, collection, serverTimestamp }] = await Promise.all([
        import("@/lib/firebase/client"),
        import("firebase/firestore"),
      ]);
      await addDoc(collection(db, "formSubmissions"), {
        pageSlug: window.location.pathname.replace(/^\//, "").slice(0, 80) || "inicio",
        formId: formId.slice(0, 80) || "form",
        fields: values,
        createdAt: serverTimestamp(),
      });
      formEl.reset();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="lp-form-status" role="status">
        {successMessage}
      </p>
    );
  }
  return (
    <form className="lp-form" onSubmit={onSubmit}>
      {fields.map((f, i) => {
        const common = { name: fieldKey(f), required: f.required, placeholder: f.placeholder };
        if (f.type === "checkbox") {
          return (
            <label key={i} style={{ flexDirection: "row", alignItems: "center" }}>
              <input type="checkbox" {...common} value="si" style={{ width: "auto" }} /> {f.label}
            </label>
          );
        }
        return (
          <label key={i}>
            <span>
              {f.label}
              {f.required ? <span aria-hidden> *</span> : null}
            </span>
            {f.type === "textarea" ? (
              <textarea rows={4} {...common} maxLength={2000} />
            ) : f.type === "select" ? (
              <select {...common} defaultValue="">
                <option value="" disabled>
                  {f.placeholder || "Selecciona…"}
                </option>
                {(f.options ?? "")
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
                  .map((o) => (
                    <option key={o}>{o}</option>
                  ))}
              </select>
            ) : (
              <input
                type={f.type}
                {...common}
                maxLength={300}
                autoComplete={f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
              />
            )}
          </label>
        );
      })}
      <input type="text" name="_website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999 }} />
      {state === "error" ? (
        <p className="lp-form-status" role="alert">
          No se pudo enviar. Inténtalo de nuevo.
        </p>
      ) : null}
      <div>
        <button type="submit" className={buttonClass} disabled={state === "sending"}>
          {state === "sending" ? "Enviando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
