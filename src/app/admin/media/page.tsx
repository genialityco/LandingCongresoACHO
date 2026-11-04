"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";

export default function MediaPage() {
  return (
    <div className="flex h-screen flex-col">
      <PageHeader
        title="Multimedia"
        description="Archivos en Firebase Storage con metadatos en Firestore. Imágenes ≤ 10 MB, videos ≤ 200 MB, PDF ≤ 20 MB. SVG bloqueado por seguridad."
      />
      <div className="min-h-0 flex-1 p-6">
        <MediaLibrary mode="manage" />
      </div>
    </div>
  );
}
