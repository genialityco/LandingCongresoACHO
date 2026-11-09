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

/** Lista de opciones escrita en el editor (una por línea o separadas por coma). */
export function parseOptions(raw?: string) {
  return (raw ?? "")
    .split(/[\n,]/)
    .map((o) => o.trim())
    .filter(Boolean);
}

export type RegistrationTexts = {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  genderLabel: string;
  genderOptions: string;
  ageLabel: string;
  agePlaceholder: string;
  countryLabel: string;
  countryOptions: string;
  professionLabel: string;
  professionOptions: string;
  areaLabel: string;
  areaOptions: string;
  selectPlaceholder: string;
  submitLabel: string;
  successMessage: string;
  duplicateMessage: string;
};

export const REGISTRATION_DEFAULTS: RegistrationTexts = {
  nameLabel: "Nombre",
  namePlaceholder: "Nombre Completo",
  emailLabel: "Correo Electrónico",
  emailPlaceholder: "ejemplo@ejemplo.com",
  phoneLabel: "Teléfono",
  phonePlaceholder: "Número de teléfono",
  genderLabel: "Género",
  genderOptions: "Femenino, Masculino, No binario, Prefiero no decirlo",
  ageLabel: "Edad",
  agePlaceholder: "Edad",
  countryLabel: "País",
  countryOptions:
    "Colombia, Argentina, Bolivia, Brasil, Chile, Costa Rica, Cuba, Ecuador, El Salvador, España, Guatemala, Honduras, México, Nicaragua, Panamá, Paraguay, Perú, Portugal, Puerto Rico, República Dominicana, Uruguay, Venezuela, Estados Unidos, Otro",
  professionLabel: "Profesión",
  professionOptions:
    "Oncólogo médico, Oncólogo clínico, Oncólogo quirúrgico, Oncólogo radioterápico / radioterapeuta, Patólogo, Radiólogo, Especialista en cuidados paliativos, Enfermero/a en oncología, Médico de atención primaria, Investigador clínico y científico, Profesional de la salud, Residente, Interno, Otro",
  areaLabel: "Ámbito de actividad profesional",
  areaOptions:
    "Hospital universitario, Hospital general (con funciones de docencia), Hospital general (sin funciones de docencia), Centro integral de cáncer, Práctica privada, Institución académica, Organización de investigación sin ánimo de lucro, Industria farmacéutica, Empresa de biotecnología, Otro",
  selectPlaceholder: "Selecciona…",
  submitLabel: "INSCRIBIRME",
  successMessage: "¡Te has registrado en el evento!",
  duplicateMessage: "Ya te has registrado con anterioridad.",
};

/** Valor de texto acotado del formulario. */
const field = (form: FormData, name: string, max = 120) => String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/**
 * Inscripción al evento. Escribe en un lote atómico `inscritos/{correo}` y
 * `inscritosTelefonos/{teléfono}`: las reglas solo permiten crear (nunca sobrescribir),
 * así que si el correo o el teléfono ya existen el lote completo se rechaza.
 */
export function RegistrationForm({ texts: given, editing }: { texts: Partial<RegistrationTexts>; editing?: boolean }) {
  // Los bloques guardados antes de añadir un campo no traen su texto: se completa con los predeterminados.
  const texts = { ...REGISTRATION_DEFAULTS, ...Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined && v !== "")) } as RegistrationTexts;
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "error">("idle");
  const [invalid, setInvalid] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editing) return;
    const form = new FormData(e.currentTarget);
    if (form.get("_website")) return setState("done");
    const nombre = field(form, "nombre");
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const telefono = normalizePhone(String(form.get("telefono") ?? ""));
    const genero = field(form, "genero");
    const edad = Number(form.get("edad"));
    const pais = field(form, "pais");
    const profesion = field(form, "profesion");
    const ambito = field(form, "ambito");
    if (nombre.length < 2) return setInvalid("Escribe tu nombre completo.");
    if (!EMAIL_RE.test(email) || email.length > 200) return setInvalid("Escribe un correo válido.");
    if (!/^[0-9]{7,15}$/.test(telefono)) return setInvalid("Escribe un número de teléfono válido.");
    if (!genero) return setInvalid(`Completa el campo «${texts.genderLabel}».`);
    if (!Number.isInteger(edad) || edad < 10 || edad > 120) return setInvalid("Escribe una edad válida.");
    if (!pais) return setInvalid(`Completa el campo «${texts.countryLabel}».`);
    if (!profesion) return setInvalid(`Completa el campo «${texts.professionLabel}».`);
    if (!ambito) return setInvalid(`Completa el campo «${texts.areaLabel}».`);
    setInvalid("");
    setState("sending");
    try {
      const [{ db }, { doc, serverTimestamp, writeBatch }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
      const batch = writeBatch(db);
      batch.set(doc(db, REGISTRATIONS_COLLECTION, email), {
        nombre,
        email,
        telefono,
        genero,
        edad,
        pais,
        profesion,
        ambito,
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

  /** Lista desplegable si hay opciones; si se dejan vacías, texto libre. */
  const choice = (name: string, label: string, options: string, wide = false) => {
    const list = parseOptions(options);
    return (
      <label className={wide ? "is-wide" : undefined}>
        <span>{label}</span>
        {list.length ? (
          <select name={name} required defaultValue="">
            <option value="" disabled>
              {texts.selectPlaceholder}
            </option>
            {list.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input type="text" name={name} required maxLength={120} placeholder={label} />
        )}
      </label>
    );
  };

  return (
    <form className="lp-registration-form" onSubmit={onSubmit} noValidate>
      <label className="is-wide">
        <span>{texts.nameLabel}</span>
        <input type="text" name="nombre" required autoComplete="name" maxLength={120} placeholder={texts.namePlaceholder} />
      </label>
      <label>
        <span>{texts.emailLabel}</span>
        <input type="email" name="email" required autoComplete="email" maxLength={200} placeholder={texts.emailPlaceholder} />
      </label>
      <label>
        <span>{texts.phoneLabel}</span>
        <input type="tel" name="telefono" required autoComplete="tel" inputMode="tel" maxLength={20} placeholder={texts.phonePlaceholder} />
      </label>
      {choice("genero", texts.genderLabel, texts.genderOptions)}
      <label>
        <span>{texts.ageLabel}</span>
        <input type="number" name="edad" required min={10} max={120} inputMode="numeric" placeholder={texts.agePlaceholder} />
      </label>
      {choice("pais", texts.countryLabel, texts.countryOptions)}
      {choice("profesion", texts.professionLabel, texts.professionOptions)}
      {choice("ambito", texts.areaLabel, texts.areaOptions, true)}
      <input type="text" name="_website" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: -9999 }} />
      {invalid ? (
        <p className="lp-registration-error is-wide" role="alert">
          {invalid}
        </p>
      ) : null}
      {state === "error" ? (
        <p className="lp-registration-error is-wide" role="alert">
          No se pudo completar la inscripción. Inténtalo de nuevo.
        </p>
      ) : null}
      <button type="submit" className="is-wide" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : texts.submitLabel}
      </button>
    </form>
  );
}
