import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebase/verify";
import { pageTag, SETTINGS_TAG } from "@/lib/public/load";

/**
 * Invalida la caché de la landing pública tras publicar. Requiere admin o editor
 * (token verificado con Admin SDK). `expire: 0` hace que la siguiente visita lea la
 * versión recién publicada.
 */
export async function POST(req: Request) {
  const user = await verifyRequest(req, ["admin", "editor"]);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { slugs?: unknown; all?: boolean };
  if (body.all === true) {
    revalidateTag(SETTINGS_TAG, { expire: 0 });
    revalidateTag("published-pages", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: "all" });
  }
  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s)) : [];
  for (const slug of slugs.slice(0, 20)) {
    revalidateTag(pageTag(slug), { expire: 0 });
    revalidatePath(`/${slug}`);
  }
  revalidatePath("/");
  return NextResponse.json({ revalidated: slugs });
}
