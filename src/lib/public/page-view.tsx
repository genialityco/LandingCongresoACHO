import "server-only";
import type { Metadata } from "next";
import { AnimationObserver } from "@/builder/blocks/client/Misc";
import { PageRenderer } from "@/builder/render/PageRenderer";
import { loadPublicSettings, loadPublishedPage } from "./load";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function publishedMetadata(slug: string): Promise<Metadata> {
  if (!SLUG_RE.test(slug)) return { title: "Página no encontrada", robots: { index: false } };
  const [page, settings] = await Promise.all([loadPublishedPage(slug), loadPublicSettings()]);
  if (!page) return { title: "Página no encontrada", robots: { index: false } };
  const seo = page.meta.seo;
  const title = seo.title || page.meta.name;
  const og = seo.ogImage?.url;
  return {
    title: settings.site.siteName && !title.includes(settings.site.siteName) ? `${title} · ${settings.site.siteName}` : title,
    description: seo.description || undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: seo.noindex ? { index: false, follow: false } : { index: true, follow: true },
    icons: settings.site.favicon?.url ? { icon: settings.site.favicon.url } : undefined,
    openGraph: {
      title,
      description: seo.description || undefined,
      type: "website",
      siteName: settings.site.siteName || undefined,
      images: og ? [{ url: og, width: seo.ogImage?.width, height: seo.ogImage?.height, alt: seo.ogImage?.alt }] : undefined,
    },
    twitter: { card: og ? "summary_large_image" : "summary", title, description: seo.description || undefined, images: og ? [og] : undefined },
  };
}

/** Renderiza la versión publicada. Devuelve null si no existe (la ruta responde 404). */
export async function PublishedPageView({ slug }: { slug: string }) {
  const [page, settings] = await Promise.all([loadPublishedPage(slug), loadPublicSettings()]);
  if (!page) return null;
  return (
    <>
      <PageRenderer data={page.data} settings={settings} />
      <AnimationObserver />
    </>
  );
}
