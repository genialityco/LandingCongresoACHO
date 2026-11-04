"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { errorMessage, formatDate, useConfirm } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase/client";
import type { TemplateDoc } from "@/lib/model/types";
import { deleteTemplate, listTemplates, templateData } from "@/lib/services/library";
import { createPage, listPages } from "@/lib/services/pages";
import { clonePageWithNewIds } from "@/lib/serialization/page-data";
import { slugify } from "@/lib/utils/slug";

export default function TemplatesPage() {
  const { actor, can } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateDoc[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => listTemplates(db).then(setTemplates).catch((e) => { toast.error(errorMessage(e)); setTemplates([]); }), []);
  useEffect(() => void refresh(), [refresh]);

  async function use(t: TemplateDoc) {
    if (!actor) return;
    setBusy(t.id);
    try {
      const existing = new Set((await listPages(db)).map((p) => p.slug));
      let slug = slugify(t.name);
      for (let i = 2; existing.has(slug); i++) slug = `${slugify(t.name)}-${i}`;
      const id = await createPage(db, actor, { name: t.name, slug, data: clonePageWithNewIds(templateData(t)), templateId: t.id });
      router.push(`/admin/pages/${id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Plantillas" description="Estructuras configurables guardadas en Firestore. Al usarlas se crea una copia independiente." />
      <div className="p-8">
        {templates === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay plantillas. Usa «Datos de demostración» en Páginas para crear las plantillas base, o guarda una página como plantilla desde el editor.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{t.name}</CardTitle>
                    <Badge variant="secondary">{t.category}</Badge>
                    {t.builtIn ? <Badge variant="outline">Base</Badge> : null}
                  </div>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {templateData(t).content.length} secciones · actualizada {formatDate(t.updatedAt)}
                </CardContent>
                <CardFooter className="gap-2">
                  {can.edit ? (
                    <Button size="sm" onClick={() => use(t)} disabled={busy === t.id}>
                      {busy === t.id ? <Loader2 className="animate-spin" /> : <Plus />} Crear página
                    </Button>
                  ) : null}
                  {(can.admin || (can.edit && !t.builtIn && t.createdBy === actor?.uid)) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!(await confirm({ title: `¿Eliminar la plantilla «${t.name}»?`, description: "Las páginas creadas con ella no se ven afectadas.", destructive: true, confirmLabel: "Eliminar" }))) return;
                        try {
                          await deleteTemplate(db, t.id);
                          toast.success("Plantilla eliminada");
                          void refresh();
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      <Trash2 /> Eliminar
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
