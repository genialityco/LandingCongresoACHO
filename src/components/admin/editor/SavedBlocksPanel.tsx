"use client";

import { createUsePuck } from "@puckeditor/core";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "@/builder/editor/context";
import type { PageData } from "@/lib/model/types";
import { cloneWithNewIds, insertIntoZone, newBlockId, type ComponentNode } from "@/lib/serialization/page-data";

const usePuck = createUsePuck();

/** Panel lateral: inserta bloques guardados como copia (editable) o vinculados (compartidos). */
export function SavedBlocksPanel() {
  const { savedBlocks, readOnly } = useEditorContext();
  const dispatch = usePuck((s) => s.dispatch);
  const appState = usePuck((s) => s.appState);

  function insert(node: ComponentNode) {
    const sel = appState.ui.itemSelector;
    const data = appState.data as PageData;
    const index = sel ? sel.index + 1 : data.content.length;
    const zone = sel?.zone;
    dispatch({ type: "setData", data: insertIntoZone(data, zone, index, node) });
    toast.success("Bloque insertado");
  }

  if (!savedBlocks.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aún no hay bloques guardados. Selecciona un componente en el lienzo y usa <strong>Guardar bloque</strong> en la barra superior.
      </div>
    );
  }
  return (
    <div className="space-y-2 p-3">
      <p className="text-xs text-muted-foreground">Se insertan después del elemento seleccionado (o al final de la página).</p>
      {savedBlocks.map((b) => (
        <div key={b.id} className="space-y-2 rounded-md border p-2">
          <div className="text-sm font-medium">{b.name}</div>
          <div className="flex gap-1.5">
            <Button size="xs" variant="outline" disabled={readOnly} onClick={() => insert(cloneWithNewIds(JSON.parse(b.json) as ComponentNode))}>
              <Copy /> Copia
            </Button>
            {b.shared ? (
              <Button
                size="xs"
                variant="outline"
                disabled={readOnly}
                onClick={() => insert({ type: "SharedBlock", props: { id: newBlockId("SharedBlock"), blockId: b.id } })}
              >
                <Link2 /> Vinculado
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
