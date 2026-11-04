"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { Loader2 } from "lucide-react";

// Puck solo se carga en el panel (nunca en la landing pública).
const PageEditor = dynamic(() => import("@/components/admin/editor/PageEditor").then((m) => m.PageEditor), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  ),
});

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageEditor pageId={id} />;
}
