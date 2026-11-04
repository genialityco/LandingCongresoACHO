"use client";

import { doc, getDoc, getDocFromServer, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";
import { SETTINGS_KEYS } from "@/lib/model/settings";
import type { MediaRef } from "@/lib/model/types";
import { saveTemplate } from "@/lib/services/library";
import { getMedia, toMediaRef, uploadMedia, type MediaScope } from "@/lib/services/media";
import { createPage, isSlugAvailable, publishPage, type Actor } from "@/lib/services/pages";
import { publishSettings, saveSettingsDraft } from "@/lib/services/settings";
import { demoPage, demoSettings, templates, type MediaMap } from "./content";
import { abstractImage, abstractVideo, logo, portrait } from "./generate-media";

export const DEMO_PAGE_ID = "demo-landing";
export const DEMO_SLUG = "demo";

type SeedReport = { created: string[]; skipped: string[]; warnings: string[]; publishedSlug: string | null };

const NAVY: [string, string, string] = ["#06243a", "#0b3c5d", "#14b8a6"];
const TEAL: [string, string, string] = ["#0f766e", "#0b3c5d", "#5eead4"];
const DEEP: [string, string, string] = ["#111827", "#1e3a8a", "#38bdf8"];

type MediaSpec = { id: string; alt: string; name: string; target: MediaScope; make: () => Promise<File | null> };

const SPECS: MediaSpec[] = [
  { id: "demo-logo-light", alt: "Logo Congreso ACHO", name: "Logo (claro)", target: { scope: "shared", folder: "logos" }, make: () => logo("logo-acho-claro.png", "ACHO", "#ffffff", "#14b8a6") },
  { id: "demo-logo-dark", alt: "Logo Congreso ACHO", name: "Logo (oscuro)", target: { scope: "shared", folder: "logos" }, make: () => logo("logo-acho-oscuro.png", "ACHO", "#0b3c5d", "#0d9488") },
  { id: "demo-hero-poster", alt: "Fondo abstracto azul del congreso", name: "Hero · póster", target: { scope: "shared" }, make: () => abstractImage("hero-poster.jpg", 1920, 1080, NAVY, 7) },
  { id: "demo-hero-video", alt: "Video de fondo abstracto", name: "Hero · video de fondo", target: { scope: "shared" }, make: () => abstractVideo("hero-fondo.webm", NAVY, 6) },
  { id: "demo-about", alt: "Sesión plenaria del congreso", name: "Imagen · el congreso", target: { scope: "shared" }, make: () => abstractImage("congreso.jpg", 1600, 1200, TEAL, 21, "Sesión plenaria") },
  { id: "demo-cta-bg", alt: "Fondo para llamada a la acción", name: "CTA · fondo", target: { scope: "shared" }, make: () => abstractImage("cta-fondo.jpg", 1920, 900, DEEP, 33) },
  { id: "demo-og", alt: "Imagen para redes sociales del congreso", name: "Open Graph", target: { scope: "shared" }, make: () => abstractImage("og-congreso.jpg", 1200, 630, NAVY, 41, "Congreso ACHO") },
  ...["Plenaria", "Talleres", "Póster científico", "Networking", "Simposio", "Clausura"].map((caption, i) => ({
    id: `demo-gallery-${i + 1}`,
    alt: `Galería: ${caption}`,
    name: `Galería ${i + 1} · ${caption}`,
    target: { scope: "shared" } as MediaScope,
    make: () => abstractImage(`galeria-${i + 1}.jpg`, 1200, 900, [NAVY, TEAL, DEEP][i % 3], 50 + i * 7, caption),
  })),
  ...["AM", "LR", "JP"].map((initials, i) => ({
    id: `demo-avatar-${i + 1}`,
    alt: `Avatar ${initials}`,
    name: `Avatar ${initials}`,
    target: { scope: "shared" } as MediaScope,
    make: () => portrait(`avatar-${i + 1}.jpg`, [TEAL, NAVY, DEEP][i], 90 + i, initials),
  })),
];

/**
 * Inicializa la demostración sin sobrescribir nada: cada recurso se crea solo si no existe.
 */
export async function runDemoSeed(db: Firestore, storage: FirebaseStorage, actor: Actor, log: (msg: string) => void = () => {}): Promise<SeedReport> {
  const report: SeedReport = { created: [], skipped: [], warnings: [], publishedSlug: null };
  const media: MediaMap = {};

  // 1. Multimedia en Firebase Storage
  for (const spec of SPECS) {
    const existing = await getMedia(db, spec.id);
    if (existing) {
      media[spec.id] = toMediaRef(existing);
      report.skipped.push(`media/${spec.id}`);
      continue;
    }
    log(`Generando ${spec.name}…`);
    const file = await spec.make();
    if (!file) {
      report.warnings.push(`El navegador no puede generar ${spec.name}; se usará el póster.`);
      media[spec.id] = null;
      continue;
    }
    const m = await uploadMedia(db, storage, actor, file, spec.target, {
      id: spec.id,
      alt: spec.alt,
      displayName: spec.name,
      tags: ["demo"],
      onProgress: (p) => log(`Subiendo ${spec.name}… ${p.percent}%`),
    }).promise;
    media[spec.id] = toMediaRef(m);
    report.created.push(`media/${spec.id}`);
  }
  // Sin video, el hero usa el póster como imagen (sigue procediendo de Storage).
  if (!media["demo-hero-video"]) media["demo-hero-video"] = null;

  // 2. Ajustes globales (borrador + publicado solo si no existían)
  log("Configurando ajustes globales…");
  const settings = demoSettings(media);
  for (const key of SETTINGS_KEYS) {
    const draft = await getDocFromServer(doc(db, "globalSettingsDrafts", key));
    const pub = await getDocFromServer(doc(db, "globalSettings", key));
    if (draft.exists() || pub.exists()) {
      report.skipped.push(`globalSettings/${key}`);
      continue;
    }
    await saveSettingsDraft(db, actor, key, settings[key]);
    await publishSettings(db, actor, key);
    report.created.push(`globalSettings/${key}`);
  }

  // 3. Permisos por defecto
  const perms = await getDoc(doc(db, "config", "permissions"));
  if (!perms.exists()) {
    await setDoc(doc(db, "config", "permissions"), { editorsCanPublish: false, updatedAt: serverTimestamp(), updatedBy: actor.uid });
    report.created.push("config/permissions");
  }

  // 4. Plantillas base
  log("Creando plantillas…");
  for (const t of templates(media)) {
    const exists = await getDocFromServer(doc(db, "templates", t.id));
    if (exists.exists()) {
      report.skipped.push(`templates/${t.id}`);
      continue;
    }
    await saveTemplate(db, actor, { ...t, builtIn: true });
    report.created.push(`templates/${t.id}`);
  }

  // 5. Página demo + publicación
  const page = await getDocFromServer(doc(db, "pages", DEMO_PAGE_ID));
  if (page.exists()) {
    report.skipped.push(`pages/${DEMO_PAGE_ID}`);
  } else if (!(await isSlugAvailable(db, DEMO_SLUG))) {
    report.warnings.push(`El slug /${DEMO_SLUG} ya está en uso; no se creó la página demo.`);
  } else {
    log("Creando y publicando la página demo…");
    await createPage(db, actor, {
      id: DEMO_PAGE_ID,
      name: "Demo · Congreso ACHO",
      slug: DEMO_SLUG,
      data: demoPage(media),
      seo: {
        title: "Congreso ACHO · Ciencia, innovación y comunidad",
        description: "Conferencias, talleres y espacios de investigación para la comunidad científica.",
        ogImage: (media["demo-og"] as MediaRef | null) ?? null,
        noindex: true,
      },
    });
    const res = await publishPage(db, actor, DEMO_PAGE_ID, { note: "Publicación inicial de demostración" });
    report.created.push(`pages/${DEMO_PAGE_ID}`, `publishedPages/${res.slug}`);
    report.publishedSlug = res.slug;
  }
  return report;
}
