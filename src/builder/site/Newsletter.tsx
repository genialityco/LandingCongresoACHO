"use client";

import { useEffect, useState, type FormEvent } from "react";

export const SUBSCRIBERS_COLLECTION = "suscritos";
const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[^\s@/]{2,}$/;

/**
 * Suscripción al newsletter. Guarda en Firestore `suscritos/{email}`: usar el correo como
 * id evita duplicados (las reglas solo permiten crear, nunca sobrescribir).
 */
export function NewsletterForm({
  placeholder,
  buttonLabel,
  successMessage,
  buttonStyle,
}: {
  placeholder: string;
  buttonLabel: string;
  successMessage: string;
  buttonStyle?: { background?: string; color?: string };
}) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "error" | "invalid">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("_website")) return setState("done");
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) return setState("invalid");
    setState("sending");
    try {
      const [{ db }, { doc, serverTimestamp, setDoc }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
      await setDoc(doc(db, SUBSCRIBERS_COLLECTION, email), {
        email,
        source: window.location.pathname.slice(0, 120) || "/",
        createdAt: serverTimestamp(),
      });
      setState("done");
    } catch (err) {
      // Si el correo ya existe, la regla rechaza la sobrescritura: ya estaba suscrito.
      setState((err as { code?: string }).code === "permission-denied" ? "already" : "error");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <p className="lp-newsletter-status" role="status">
        {state === "already" ? "Este correo ya está suscrito." : successMessage}
      </p>
    );
  }
  return (
    <form className="lp-newsletter-form" onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor="lp-newsletter-email">
        Correo electrónico
      </label>
      <input id="lp-newsletter-email" type="email" name="email" required autoComplete="email" placeholder={placeholder} maxLength={200} aria-invalid={state === "invalid"} />
      <input type="text" name="_website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999 }} />
      <button type="submit" disabled={state === "sending"} style={{ background: buttonStyle?.background || undefined, color: buttonStyle?.color || undefined }}>
        {state === "sending" ? "Enviando…" : buttonLabel}
      </button>
      {state === "invalid" ? (
        <p className="lp-newsletter-status" role="alert">
          Escribe un correo válido.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="lp-newsletter-status" role="alert">
          No se pudo completar. Inténtalo de nuevo.
        </p>
      ) : null}
    </form>
  );
}

/** Texto con {year} reemplazado en el navegador (evita usar la hora actual en el servidor). */
export function YearText({ text }: { text: string }) {
  const [year, setYear] = useState("");
  useEffect(() => setYear(String(new Date().getFullYear())), []);
  return <span>{text.replace("{year}", year)}</span>;
}
