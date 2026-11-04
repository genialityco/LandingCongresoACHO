import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadPublicSettings, loadPublishedPage } from "@/lib/public/load";
import { PublishedPageView, publishedMetadata } from "@/lib/public/page-view";

async function homeSlug() {
  const settings = await loadPublicSettings();
  return settings.site.homeSlug || null;
}

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const slug = await homeSlug();
  return slug ? publishedMetadata(slug) : { title: "Inicio" };
}

async function Home() {
  // Se resuelve en cada petición (los datos siguen cacheados con "use cache"), así el
  // build no necesita acceder a Firestore.
  await connection();
  const slug = await homeSlug();
  if (slug && (await loadPublishedPage(slug))) return <PublishedPageView slug={slug} />;
  // Sin página de inicio configurada: aviso mínimo (el contenido real se administra desde el panel).
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Sitio en construcción</h1>
        <p className="text-muted-foreground">Configura la página de inicio en Ajustes › Sitio y publícala desde el administrador.</p>
        <Link className="text-sm underline" href="/admin">
          Ir al administrador
        </Link>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <Home />
    </Suspense>
  );
}
