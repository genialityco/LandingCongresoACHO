"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MediaField } from "@/components/admin/media/MediaField";
import { db } from "@/lib/firebase/client";
import type { PageDoc } from "@/lib/model/types";
import { updatePageMeta, validateSlug } from "@/lib/services/pages";
import { slugify } from "@/lib/utils/slug";
import { useAuth } from "../auth";
import { errorMessage, FormRow } from "../ui";

export function PageSettingsDialog({
  page,
  open,
  onOpenChange,
  onSaved,
}: {
  page: PageDoc;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: (p: PageDoc) => void;
}) {
  const { actor, can } = useAuth();
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [seo, setSeo] = useState(page.seo);
  const [cover, setCover] = useState(page.coverImage ?? null);
  const [busy, setBusy] = useState(false);
  const slugError = validateSlug(slug);

  async function save() {
    if (!actor || slugError) return;
    setBusy(true);
    try {
      const patch = { name: name.trim(), slug, seo, coverImage: cover };
      await updatePageMeta(db, actor, page.id, patch);
      onSaved({ ...page, ...patch });
      toast.success(slug !== page.publishedSlug && page.publishedSlug ? "Guardado. El nuevo slug se aplicará al publicar." : "Ajustes guardados");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Ajustes de la página</DialogTitle>
          <DialogDescription>Nombre, URL y SEO. Se aplican a la versión pública al publicar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormRow label="Nombre" htmlFor="ps-name">
            <Input id="ps-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!can.edit} />
          </FormRow>
          <FormRow label="URL amigable (slug)" htmlFor="ps-slug" hint={slugError ?? `Se publicará en /${slug}`}>
            <Input id="ps-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} disabled={!can.edit} aria-invalid={!!slugError} />
          </FormRow>
          <FormRow label="Título SEO" htmlFor="ps-title" hint={`${seo.title.length}/60 caracteres recomendados`}>
            <Input id="ps-title" value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })} disabled={!can.edit} />
          </FormRow>
          <FormRow label="Meta descripción" htmlFor="ps-desc" hint={`${seo.description.length}/160 caracteres recomendados`}>
            <Textarea id="ps-desc" rows={3} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} disabled={!can.edit} />
          </FormRow>
          <FormRow label="URL canónica (opcional)" htmlFor="ps-canon">
            <Input id="ps-canon" value={seo.canonicalUrl ?? ""} placeholder="https://…" onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value || undefined })} disabled={!can.edit} />
          </FormRow>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Imagen Open Graph (1200×630)">
              <MediaField value={seo.ogImage} onChange={(m) => setSeo({ ...seo, ogImage: m })} readOnly={!can.edit} />
            </FormRow>
            <FormRow label="Imagen de portada (listados)">
              <MediaField value={cover} onChange={setCover} readOnly={!can.edit} />
            </FormRow>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
            <span>
              <span className="font-medium">Ocultar de buscadores</span>
              <span className="block text-xs text-muted-foreground">Añade noindex, nofollow.</span>
            </span>
            <Switch checked={seo.noindex} onCheckedChange={(v) => setSeo({ ...seo, noindex: !!v })} disabled={!can.edit} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={busy || !!slugError || !can.edit}>
            {busy ? <Loader2 className="animate-spin" /> : null} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
