"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { errorMessage, formatDate, useConfirm } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BLOCKS } from "@/builder/schema";
import { db } from "@/lib/firebase/client";
import type { SavedBlockDoc } from "@/lib/model/types";
import { deleteBlock, listSavedBlocks, updateBlock } from "@/lib/services/library";

export default function BlocksPage() {
  const { can } = useAuth();
  const confirm = useConfirm();
  const [blocks, setBlocks] = useState<SavedBlockDoc[] | null>(null);
  const refresh = useCallback(() => listSavedBlocks(db).then(setBlocks).catch((e) => { toast.error(errorMessage(e)); setBlocks([]); }), []);
  useEffect(() => void refresh(), [refresh]);

  async function patch(b: SavedBlockDoc, p: Partial<{ name: string; shared: boolean }>) {
    try {
      await updateBlock(db, b.id, p);
      setBlocks((prev) => prev?.map((x) => (x.id === b.id ? { ...x, ...p } : x)) ?? null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Bloques guardados"
        description="Secciones reutilizables. «Copia» inserta un duplicado editable; «Vinculado» inserta una referencia que se actualiza al republicar."
      />
      <div className="p-8">
        {blocks === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Guarda bloques desde el editor seleccionando un componente y pulsando «Guardar bloque».</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vinculable</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((b) => {
                  const type = (JSON.parse(b.json) as { type: string }).type;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Input defaultValue={b.name} disabled={!can.edit} onBlur={(e) => e.target.value.trim() && e.target.value !== b.name && patch(b, { name: e.target.value.trim() })} className="max-w-xs" />
                      </TableCell>
                      <TableCell className="text-sm">{(BLOCKS as Record<string, { label: string }>)[type]?.label ?? type}</TableCell>
                      <TableCell>
                        <Switch checked={b.shared} disabled={!can.edit} onCheckedChange={(v) => patch(b, { shared: !!v })} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(b.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        {can.edit ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!(await confirm({ title: `¿Eliminar «${b.name}»?`, description: "Las copias ya insertadas no cambian. Los bloques vinculados dejarán de poder publicarse hasta reemplazarlos.", destructive: true, confirmLabel: "Eliminar" }))) return;
                              try {
                                await deleteBlock(db, b.id);
                                void refresh();
                              } catch (e) {
                                toast.error(errorMessage(e));
                              }
                            }}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
