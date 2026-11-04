"use client";

import { createContext, useContext, useState } from "react";
import { FileText, Film, ImagePlus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MediaKind, MediaRef } from "@/lib/model/types";
import { toMediaRef } from "@/lib/services/media";
import { MediaLibrary } from "./MediaLibrary";

/** Página actual (si existe) para ofrecer subir archivos a su carpeta. */
export const MediaScopeContext = createContext<{ pageId: string | null }>({ pageId: null });

export function MediaPickerDialog({
  open,
  onOpenChange,
  kinds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kinds?: MediaKind[];
  onPick: (ref: MediaRef) => void;
}) {
  const { pageId } = useContext(MediaScopeContext);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] flex-col sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Biblioteca multimedia</DialogTitle>
          <DialogDescription>Selecciona un archivo existente o sube uno nuevo a Firebase Storage. Doble clic para elegir.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          {open ? (
            <MediaLibrary
              mode="pick"
              kinds={kinds}
              pageId={pageId}
              onPick={(m) => {
                onPick(toMediaRef(m));
                onOpenChange(false);
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Control compacto para elegir un recurso multimedia (imagen, video o documento). */
export function MediaField({
  value,
  onChange,
  kinds = ["image"],
  showAlt = true,
  readOnly,
  label,
}: {
  value: MediaRef | null | undefined;
  onChange: (v: MediaRef | null) => void;
  kinds?: MediaKind[];
  showAlt?: boolean;
  readOnly?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const isVideo = value?.kind === "video" || value?.mime?.startsWith("video/");
  const preview = value?.thumbUrl || (!isVideo ? value?.url : undefined);
  return (
    <div className="space-y-1.5">
      {value?.url ? (
        <div className="group relative overflow-hidden rounded-md border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={value.alt ?? ""} className="aspect-video w-full object-cover" />
          ) : (
            <div className="grid aspect-video place-items-center text-muted-foreground">
              {isVideo ? <Film className="size-6" /> : <FileText className="size-6" />}
            </div>
          )}
          {!readOnly ? (
            <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <Button size="xs" variant="secondary" onClick={() => setOpen(true)}>
                <RefreshCw /> Cambiar
              </Button>
              <Button size="icon-xs" variant="secondary" aria-label="Quitar" onClick={() => onChange(null)}>
                <X />
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <Button variant="outline" className="h-20 w-full flex-col border-dashed" disabled={readOnly} onClick={() => setOpen(true)} data-testid="media-field-pick">
          <ImagePlus />
          <span className="text-xs">{label ?? (kinds.includes("video") && !kinds.includes("image") ? "Elegir video" : "Elegir imagen")}</span>
        </Button>
      )}
      {value?.url && showAlt && !isVideo ? (
        <Input
          className="h-7 text-xs"
          placeholder="Texto alternativo"
          value={value.alt ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...value, alt: e.target.value })}
          aria-label="Texto alternativo"
        />
      ) : null}
      <MediaPickerDialog open={open} onOpenChange={setOpen} kinds={kinds} onPick={(ref) => onChange({ ...ref, alt: value?.alt || ref.alt })} />
    </div>
  );
}
