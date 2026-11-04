import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { collection, doc, getDoc, getDocs } from "firebase/firestore/lite";
import { publicDb } from "@/lib/firebase/server";
import { EMPTY_SETTINGS, SETTINGS_KEYS, withDefaults, type GlobalSettings, type SettingsKey } from "@/lib/model/settings";
import type { PageData, PublishedPageDoc } from "@/lib/model/types";
import { joinChunks } from "@/lib/serialization/chunks";
import { parsePageData } from "@/lib/serialization/page-data";

/**
 * Lecturas públicas (sin autenticación). Solo acceden a publishedPages y globalSettings,
 * que las reglas permiten leer a cualquiera. Nunca a borradores.
 */
export const PUBLIC_CACHE = { stale: 60, revalidate: 300, expire: 86_400 };
export const pageTag = (slug: string) => `published-page:${slug}`;
export const SETTINGS_TAG = "public-settings";

export async function loadPublishedPage(slug: string): Promise<{ meta: PublishedPageDoc; data: PageData } | null> {
  "use cache";
  // Caché por slug: publicar invalida la etiqueta (revalidateTag) y el resto expira solo.
  cacheTag(pageTag(slug), "published-pages");
  cacheLife(PUBLIC_CACHE);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  let snap;
  try {
    snap = await getDoc(doc(publicDb, "publishedPages", slug));
  } catch (error) {
    console.error("[public] No se pudo leer la página publicada", { slug, error });
    return null;
  }
  if (!snap.exists()) return null;
  const meta = snap.data() as PublishedPageDoc;
  let json = meta.inline;
  if (!json) {
    let chunks;
    try {
      chunks = await getDocs(collection(publicDb, "publishedPages", slug, "chunks"));
    } catch (error) {
      console.error("[public] No se pudieron leer los fragmentos de la página", { slug, error });
      return null;
    }
    json = joinChunks(chunks.docs.map((d) => d.data() as { index: number; json: string }));
  }
  try {
    // Los Timestamp de Firestore no son serializables por la caché: copia JSON plana.
    return { meta: JSON.parse(JSON.stringify(meta)) as PublishedPageDoc, data: parsePageData(json) };
  } catch (error) {
    console.error("[public] La página publicada contiene datos inválidos", { slug, error });
    return null;
  }
}

export async function loadPublicSettings(): Promise<GlobalSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife(PUBLIC_CACHE);
  let snap;
  try {
    snap = await getDocs(collection(publicDb, "globalSettings"));
  } catch (error) {
    console.error("[public] No se pudieron leer los ajustes públicos; se usarán valores vacíos", error);
    return EMPTY_SETTINGS;
  }
  const values = new Map(snap.docs.map((d) => [d.id, d.data().value]));
  const out = {} as GlobalSettings;
  for (const key of SETTINGS_KEYS) (out as Record<SettingsKey, unknown>)[key] = withDefaults(key, values.get(key));
  return JSON.parse(JSON.stringify(out)) as GlobalSettings;
}
