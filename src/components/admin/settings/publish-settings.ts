"use client";

/** Los ajustes globales afectan a todas las páginas: se invalida toda la caché ISR. */
export async function publishSettingsAndRevalidate(getIdToken: () => Promise<string | null>) {
  const token = await getIdToken();
  if (!token) return false;
  const res = await fetch("/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ all: true }),
  }).catch(() => null);
  return !!res?.ok;
}
