"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/admin/auth";
import { AnimationObserver } from "@/builder/blocks/client/Misc";
import { PageRenderer } from "@/builder/render/PageRenderer";
import { db } from "@/lib/firebase/client";
import type { GlobalSettings } from "@/lib/model/settings";
import type { PageData } from "@/lib/model/types";
import { loadDraft, loadVersion } from "@/lib/services/pages";
import { loadSettings } from "@/lib/services/settings";

/** Vista previa autenticada (admin/editor/viewer) del borrador o de una versión concreta. */
function Preview({ pageId }: { pageId: string }) {
  const { user, role, loading } = useAuth();
  const versionId = useSearchParams().get("version");
  const [state, setState] = useState<{ data: PageData; settings: GlobalSettings; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !role) return;
    (async () => {
      try {
        const [content, settings] = await Promise.all([
          versionId ? loadVersion(db, pageId, versionId).then((v) => ({ data: v.data, label: `Versión ${v.meta.number}` })) : loadDraft(db, pageId).then((d) => ({ data: d.data, label: `Borrador (revisión ${d.revision})` })),
          loadSettings(db, "drafts"),
        ]);
        setState({ data: content.data, settings: settings.settings, label: content.label });
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [loading, role, pageId, versionId]);

  if (!loading && (!user || !role)) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <p>
          Necesitas <Link className="underline" href={`/admin/login?next=/admin`}>iniciar sesión</Link> con un usuario autorizado para ver borradores.
        </p>
      </div>
    );
  }
  if (error) return <div className="grid min-h-screen place-items-center text-destructive">{error}</div>;
  if (!state) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  return (
    <>
      <div className="sticky top-0 z-[100] flex items-center justify-center gap-3 bg-amber-400 px-4 py-1.5 text-sm font-medium text-amber-950">
        Vista previa · {state.label} · no es la versión pública
      </div>
      <PageRenderer data={state.data} settings={state.settings} />
      <AnimationObserver />
    </>
  );
}

export default function PreviewPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = use(params);
  return (
    <Suspense>
      <Preview pageId={pageId} />
    </Suspense>
  );
}
