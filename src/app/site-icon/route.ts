import { NextResponse } from "next/server";
import { connection } from "next/server";
import { loadPublicSettings } from "@/lib/public/load";

/**
 * Favicon administrable: redirige al ícono configurado en Ajustes › Sitio (Firebase
 * Storage). Los ajustes vienen de la caché pública, que se invalida al publicarlos.
 */
export async function GET() {
  await connection();
  const settings = await loadPublicSettings();
  const url = settings.site.favicon?.url;
  if (!url) return new NextResponse(null, { status: 404 });
  const res = NextResponse.redirect(url, 307);
  // Caché corta: al cambiar el favicon, el navegador lo vuelve a pedir pronto.
  res.headers.set("Cache-Control", "public, max-age=300, must-revalidate");
  return res;
}
