import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadPublishedPage } from "@/lib/public/load";
import { PublishedPageView, publishedMetadata } from "@/lib/public/page-view";

/**
 * Landing pública (Server Component). Con Cache Components las páginas se renderizan bajo
 * demanda y se cachean (ISR); los datos usan "use cache" con etiquetas por slug que
 * /api/revalidate invalida al publicar.
 */
export function generateStaticParams() {
  // Cache Components exige al menos un parámetro; el marcador no es un slug válido y
  // responde 404 sin consultar Firestore durante el build.
  return [{ slug: "__shell__" }];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return publishedMetadata((await params).slug);
}

async function Content({ params }: Props) {
  const { slug } = await params;
  if (!(await loadPublishedPage(slug))) notFound();
  return <PublishedPageView slug={slug} />;
}

export default function PublicPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <Content params={params} />
    </Suspense>
  );
}
