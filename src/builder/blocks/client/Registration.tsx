"use client";

import { useState, type FormEvent } from "react";

export const REGISTRATIONS_COLLECTION = "inscritos";
export const REGISTRATION_PHONES_COLLECTION = "inscritosTelefonos";
const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

/** Solo dígitos; quita el indicativo de Colombia para que "+57 315…" y "315…" sean el mismo número. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits;
}

export type RegistrationTexts = {
  nameLabel: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  successMessage: string;
  duplicateMessage: string;
};

/**
 * Inscripción al evento. Escribe en un lote atómico `inscritos/{correo}` y
 * `inscritosTelefonos/{teléfono}`: las reglas solo permiten crear (nunca sobrescribir),
 * así que si el correo o el teléfono ya existen el lote completo se rechaza.
 */
export function RegistrationForm({ texts, editing }: { texts: RegistrationTexts; editing?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "error">("idle");
  const [invalid, setInvalid] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editing) return;
    const form = new FormData(e.currentTarget);
    if (form.get("_website")) return setState("done");
    const nombre = String(form.get("nombre") ?? "").trim().replace(/\s+/g, " ");
    const telefono = normalizePhone(String(form.get("telefono") ?? ""));
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (nombre.length < 2 || nombre.length > 120) return setInvalid("Escribe tu nombre completo.");
    if (!/^[0-9]{7,15}$/.test(telefono)) return setInvalid("Escribe un número de teléfono válido.");
    if (!EMAIL_RE.test(email) || email.length > 200) return setInvalid("Escribe un correo válido.");
    setInvalid("");
    setState("sending");
    try {
      const [{ db }, { doc, serverTimestamp, writeBatch }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
      const batch = writeBatch(db);
      batch.set(doc(db, REGISTRATIONS_COLLECTION, email), {
        nombre,
        email,
        telefono,
        source: window.location.pathname.slice(0, 120) || "/",
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, REGISTRATION_PHONES_COLLECTION, telefono), { email, createdAt: serverTimestamp() });
      await batch.commit();
      setState("done");
    } catch (err) {
      // La regla rechaza sobrescribir: el correo o el teléfono ya estaban inscritos.
      setState((err as { code?: string }).code === "permission-denied" ? "already" : "error");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <p className={`lp-registration-status${state === "already" ? " is-already" : ""}`} role="status">
        {state === "already" ? texts.duplicateMessage : texts.successMessage}
      </p>
    );
  }
  return (
    <form className="lp-registration-form" onSubmit={onSubmit} noValidate>
      <label>
        <span>{texts.nameLabel}</span>
        <input type="text" name="nombre" required autoComplete="name" maxLength={120} placeholder={texts.namePlaceholder} />
      </label>
      <label>
        <span>{texts.phoneLabel}</span>
        <input type="tel" name="telefono" required autoComplete="tel" inputMode="tel" maxLength={20} placeholder={texts.phonePlaceholder} />
      </label>
      <label>
        <span>{texts.emailLabel}</span>
        <input type="email" name="email" required autoComplete="email" maxLength={200} placeholder={texts.emailPlaceholder} />
      </label>
      <input type="text" name="_website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999 }} />
      {invalid ? (
        <p className="lp-registration-error" role="alert">
          {invalid}
        </p>
      ) : null}
      {state === "error" ? (
        <p className="lp-registration-error" role="alert">
          No se pudo completar la inscripción. Inténtalo de nuevo.
        </p>
      ) : null}
      <button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : texts.submitLabel}
      </button>
    </form>
  );
}
