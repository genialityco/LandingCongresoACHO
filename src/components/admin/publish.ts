"use client";

import { db } from "@/lib/firebase/client";
import { publishPage, unpublishPage, type Actor } from "@/lib/services/pages";

/**
 * Pide al servidor (route handler con Admin SDK) que invalide la caché ISR de las rutas
 * publicadas. Si falla, la página se actualiza igualmente al expirar la caché.
 */
export async function revalidatePaths(getIdToken: () => Promise<string | null>, slugs: (string | null | undefined)[]) {
  const token = await getIdToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slugs: slugs.filter(Boolean) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function publishAndRevalidate(actor: Actor, getIdToken: () => Promise<string | null>, pageId: string, expectedRevision?: number) {
  const result = await publishPage(db, actor, pageId, { expectedRevision });
  const revalidated = await revalidatePaths(getIdToken, [result.slug, result.previousSlug]);
  return { ...result, revalidated };
}

export async function unpublishAndRevalidate(actor: Actor, getIdToken: () => Promise<string | null>, pageId: string) {
  const slug = await unpublishPage(db, actor, pageId);
  await revalidatePaths(getIdToken, [slug]);
  return slug;
}
