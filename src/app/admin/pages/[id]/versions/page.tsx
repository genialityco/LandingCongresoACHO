"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, Loader2, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { errorMessage, formatDate, useConfirm } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/firebase/client";
import type { PageDoc, VersionDoc } from "@/lib/model/types";
import { createManualVersion, getPage, listVersions, restoreVersion } from "@/lib/services/pages";
import { formatBytes } from "@/lib/services/media";

const KIND = { publish: "Publicación", manual: "Punto de restauración", backup: "Copia automática" } as const;

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { actor, can } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [page, setPage] = useState<PageDoc | null>(null);
  const [versions, setVersions] = useState<VersionDoc[] | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([getPage(db, id), listVersions(db, id)]);
      setPage(p);
      setVersions(v);
    } catch (e) {
      toast.error(errorMessage(e));
      setVersions([]);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function restore(v: VersionDoc) {
    if (!actor) return;
    const ok = await confirm({
      title: `¿Restaurar la versión ${v.number}?`,
      description: "Reemplaza el borrador actual (antes se guarda una copia automática). La página publicada no cambia hasta que vuelvas a publicar.",
      confirmLabel: "Restaurar como borrador",
    });
    if (!ok) return;
    setBusy(v.id);
    try {
      await restoreVersion(db, actor, id, v.id);
      toast.success(`Versión ${v.number} restaurada como borrador`, { action: { label: "Abrir editor", onClick: () => router.push(`/admin/pages/${id}`) } });
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function snapshot() {
    if (!actor) return;
    setBusy("manual");
    try {
      await createManualVersion(db, actor, id, note.trim());
      setNote("");
      toast.success("Punto de restauración creado");
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title={`Historial · ${page?.name ?? "…"}`}
        description="Cada publicación crea una versión inmutable. Puedes previsualizarla o restaurarla como borrador."
        actions={
          <Button variant="outline" render={<Link href={`/admin/pages/${id}`} />}>
            <ArrowLeft /> Volver al editor
          </Button>
        }
      />
      <div className="space-y-6 p-8">
        {can.edit ? (
          <div className="flex max-w-xl gap-2">
            <Input placeholder="Nota (opcional), p. ej. «Antes del rediseño»" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={snapshot} disabled={busy === "manual"}>
              {busy === "manual" ? <Loader2 className="animate-spin" /> : <Save />} Guardar punto de restauración
            </Button>
          </div>
        ) : null}
        {versions === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay versiones. Se crean al publicar o al guardar un punto de restauración.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id} data-testid={`version-${v.number}`}>
                    <TableCell className="font-mono">v{v.number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {KIND[v.kind]}
                        {page?.publishedVersionId === v.id ? <Badge className="bg-green-600 text-white">En línea</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(v.createdAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.createdByEmail ?? v.createdBy}</TableCell>
                    <TableCell className="max-w-64 truncate text-sm">{v.note || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatBytes(v.byteSize)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" render={<a href={`/preview/${id}?version=${v.id}`} target="_blank" rel="noreferrer" />}>
                          <Eye /> Ver
                        </Button>
                        {can.edit ? (
                          <Button size="sm" variant="outline" onClick={() => restore(v)} disabled={busy === v.id}>
                            {busy === v.id ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restaurar
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
