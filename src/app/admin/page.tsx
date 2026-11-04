"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Database, ExternalLink, Eye, History, Loader2, MoreHorizontal, Pencil, Plus, Rocket, Trash2, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { publishAndRevalidate, unpublishAndRevalidate } from "@/components/admin/publish";
import { errorMessage, formatDate, FormRow, NativeSelect, useConfirm } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db, storage } from "@/lib/firebase/client";
import type { PageDoc, TemplateDoc } from "@/lib/model/types";
import { listTemplates, templateData } from "@/lib/services/library";
import { createPage, deletePage, duplicatePage, listPages, PublishValidationError, validateSlug } from "@/lib/services/pages";
import { clonePageWithNewIds } from "@/lib/serialization/page-data";
import { slugify } from "@/lib/utils/slug";

export default function PagesDashboard() {
  const { actor, can, getIdToken } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [pages, setPages] = useState<PageDoc[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [seeding, setSeeding] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPages(await listPages(db));
    } catch (e) {
      toast.error(errorMessage(e));
      setPages([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runSeed() {
    if (!actor) return;
    const ok = await confirm({
      title: "Inicializar datos de demostración",
      description:
        "Se crearán (solo si no existen) imágenes y video de ejemplo en Storage, ajustes globales, plantillas y la página «demo», que se publicará. No sobrescribe información existente.",
      confirmLabel: "Inicializar",
    });
    if (!ok) return;
    setSeeding("Iniciando…");
    try {
      const { runDemoSeed } = await import("@/lib/seed/demo");
      const report = await runDemoSeed(db, storage, actor, (msg) => setSeeding(msg));
      if (report.publishedSlug) await import("@/components/admin/publish").then((m) => m.revalidatePaths(getIdToken, [report.publishedSlug, ""]));
      toast.success("Datos de demostración listos", { description: `${report.created.length} creados, ${report.skipped.length} ya existían.` });
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSeeding(null);
    }
  }

  async function onPublish(p: PageDoc) {
    if (!actor) return;
    try {
      const r = await publishAndRevalidate(actor, getIdToken, p.id);
      toast.success(`«${p.name}» publicada (v${r.versionNumber})`);
      await refresh();
    } catch (e) {
      if (e instanceof PublishValidationError) toast.error("No se puede publicar", { description: e.issues.map((i) => i.message).join(" · ") });
      else toast.error(errorMessage(e));
    }
  }

  async function onUnpublish(p: PageDoc) {
    if (!actor) return;
    const ok = await confirm({ title: `¿Despublicar «${p.name}»?`, description: `La URL /${p.publishedSlug} dejará de estar disponible. El borrador y el historial se conservan.`, confirmLabel: "Despublicar", destructive: true });
    if (!ok) return;
    try {
      await unpublishAndRevalidate(actor, getIdToken, p.id);
      toast.success("Página despublicada");
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onDuplicate(p: PageDoc) {
    if (!actor) return;
    try {
      let slug = `${p.slug}-copia`;
      for (let i = 2; pages?.some((x) => x.slug === slug); i++) slug = `${p.slug}-copia-${i}`;
      const id = await duplicatePage(db, actor, p.id, `${p.name} (copia)`, slug);
      toast.success("Página duplicada");
      router.push(`/admin/pages/${id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onDelete(p: PageDoc) {
    const ok = await confirm({
      title: `¿Eliminar «${p.name}»?`,
      description: "Se eliminarán el borrador, todas las versiones y la versión publicada. Los archivos multimedia se conservan en la biblioteca.",
      confirmLabel: "Eliminar definitivamente",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePage(db, p.id);
      if (p.publishedSlug) await import("@/components/admin/publish").then((m) => m.revalidatePaths(getIdToken, [p.publishedSlug]));
      toast.success("Página eliminada");
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Páginas"
        description="Crea, edita y publica landing pages. Todo se guarda en Cloud Firestore."
        actions={
          <>
            {can.admin ? (
              <Button variant="outline" onClick={runSeed} disabled={!!seeding}>
                {seeding ? <Loader2 className="animate-spin" /> : <Database />} {seeding ?? "Datos de demostración"}
              </Button>
            ) : null}
            {can.edit ? (
              <Button onClick={() => setCreateOpen(true)} data-testid="new-page">
                <Plus /> Nueva página
              </Button>
            ) : null}
          </>
        }
      />
      <div className="p-8">
        {pages === null ? (
          <div className="grid h-40 place-items-center text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : pages.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <h2 className="text-lg font-medium">Aún no hay páginas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crea una página desde cero o a partir de una plantilla.{can.admin ? " También puedes cargar la demostración." : ""}</p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última edición</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((p) => (
                  <TableRow key={p.id} data-testid={`page-row-${p.slug}`}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/pages/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">/{p.slug}</TableCell>
                    <TableCell>
                      {p.status === "published" ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-green-600 text-white">Publicada</Badge>
                          {p.hasUnpublishedChanges ? <Badge variant="outline">Cambios sin publicar</Badge> : null}
                        </div>
                      ) : (
                        <Badge variant="outline">{p.status === "unpublished" ? "Despublicada" : "Borrador"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.updatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Acciones" />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => router.push(`/admin/pages/${p.id}`)}>
                            <Pencil /> {can.edit ? "Editar" : "Abrir"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/preview/${p.id}`, "_blank")}>
                            <Eye /> Vista previa del borrador
                          </DropdownMenuItem>
                          {p.status === "published" && p.publishedSlug ? (
                            <DropdownMenuItem onClick={() => window.open(`/${p.publishedSlug}`, "_blank")}>
                              <ExternalLink /> Ver publicada
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => router.push(`/admin/pages/${p.id}/versions`)}>
                            <History /> Historial de versiones
                          </DropdownMenuItem>
                          {can.edit ? (
                            <DropdownMenuItem onClick={() => onDuplicate(p)}>
                              <Copy /> Duplicar
                            </DropdownMenuItem>
                          ) : null}
                          {can.publish ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onPublish(p)}>
                                <Rocket /> Publicar borrador
                              </DropdownMenuItem>
                              {p.status === "published" ? (
                                <DropdownMenuItem onClick={() => onUnpublish(p)}>
                                  <Undo2 /> Despublicar
                                </DropdownMenuItem>
                              ) : null}
                            </>
                          ) : null}
                          {can.admin ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => onDelete(p)}>
                                <Trash2 /> Eliminar
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {createOpen ? <CreatePageDialog onClose={() => setCreateOpen(false)} onCreated={(id) => router.push(`/admin/pages/${id}`)} /> : null}
    </>
  );
}

function CreatePageDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { actor } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates(db).then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugError = effectiveSlug ? validateSlug(effectiveSlug) : null;

  async function create() {
    if (!actor) return;
    setBusy(true);
    setError(null);
    try {
      const t = templates.find((x) => x.id === templateId);
      const id = await createPage(db, actor, {
        name: name.trim(),
        slug: effectiveSlug,
        data: t ? clonePageWithNewIds(templateData(t)) : undefined,
        templateId: t?.id ?? null,
      });
      toast.success("Página creada");
      onCreated(id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva página</DialogTitle>
          <DialogDescription>Se crea como borrador en Firestore. No será pública hasta que la publiques.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormRow label="Nombre" htmlFor="np-name">
            <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </FormRow>
          <FormRow label="URL (slug)" htmlFor="np-slug" hint={slugError ?? (effectiveSlug ? `/${effectiveSlug}` : undefined)}>
            <Input
              id="np-slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              aria-invalid={!!slugError}
            />
          </FormRow>
          <FormRow label="Plantilla" htmlFor="np-template">
            <NativeSelect id="np-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">En blanco</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.category}
                </option>
              ))}
            </NativeSelect>
          </FormRow>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={create} disabled={!name.trim() || !effectiveSlug || !!slugError || busy} data-testid="create-page-submit">
            {busy ? <Loader2 className="animate-spin" /> : null} Crear y editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
