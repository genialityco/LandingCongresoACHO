"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Check, Copy, FileText, Film, Image as ImageIcon, Link2, Loader2, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { db, storage } from "@/lib/firebase/client";
import type { MediaDoc, MediaKind } from "@/lib/model/types";
import {
  ACCEPT_ATTR,
  cleanupSuperseded,
  deleteMedia,
  findMediaReferences,
  formatBytes,
  listMedia,
  replaceMediaFile,
  updateMediaMeta,
  uploadMedia,
  type MediaFolder,
  type MediaReferences,
  type UploadHandle,
} from "@/lib/services/media";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth";
import { errorMessage, formatDate, FormRow, NativeSelect, useConfirm } from "../ui";

type Upload = { key: string; name: string; percent: number; error?: string; handle?: UploadHandle; done?: boolean };

export type MediaLibraryProps = {
  mode: "manage" | "pick";
  kinds?: MediaKind[];
  pageId?: string | null;
  onPick?: (m: MediaDoc) => void;
};

const KIND_ICON = { image: ImageIcon, video: Film, document: FileText } as const;

export function MediaLibrary({ mode, kinds, pageId, onPick }: MediaLibraryProps) {
  const { actor, can } = useAuth();
  const confirm = useConfirm();
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>(kinds?.length === 1 ? kinds[0] : "all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [target, setTarget] = useState<"shared" | "page">("shared");
  const [folder, setFolder] = useState<"auto" | MediaFolder>("auto");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (after?: QueryDocumentSnapshot | null) => {
    setLoading(true);
    try {
      const page = await listMedia(db, { after, pageSize: 60 });
      setItems((prev) => (after ? [...prev, ...page.items] : page.items));
      setCursor(page.cursor);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (m) =>
        (!kinds || kinds.includes(m.kind)) &&
        (kindFilter === "all" || m.kind === kindFilter) &&
        (scopeFilter === "all" || (scopeFilter === "page" ? m.pageId === pageId : m.scope === scopeFilter)) &&
        (!q || m.searchName?.includes(q) || m.name.toLowerCase().includes(q) || m.tags?.some((t) => t.includes(q))),
    );
  }, [items, kinds, kindFilter, scopeFilter, search, pageId]);

  const selected = items.find((m) => m.id === selectedId) ?? null;

  function startUploads(files: FileList | File[]) {
    if (!actor) return;
    for (const file of Array.from(files)) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      const handle = uploadMedia(
        db,
        storage,
        actor,
        file,
        {
          scope: target === "page" && pageId ? "page" : "shared",
          pageId: target === "page" ? pageId : null,
          folder: folder === "auto" ? undefined : folder,
        },
        { onProgress: (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, percent: p.percent } : x))) },
      );
      setUploads((u) => [...u, { key, name: file.name, percent: 0, handle }]);
      handle.promise
        .then((m) => {
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, percent: 100, done: true } : x)));
          setItems((prev) => [m, ...prev]);
          setSelectedId(m.id);
          setTimeout(() => setUploads((u) => u.filter((x) => x.key !== key)), 2500);
        })
        .catch((e) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: errorMessage(e) } : x))));
    }
  }

  function patchItem(id: string, patch: Partial<MediaDoc>) {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3"
      onDragOver={(e) => {
        if (can.edit) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!can.edit) return;
        e.preventDefault();
        if (e.dataTransfer.files.length) startUploads(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2 left-2 size-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nombre o etiqueta…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!kinds || kinds.length > 1 ? (
          <NativeSelect className="w-36" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Tipo">
            <option value="all">Todos los tipos</option>
            <option value="image">Imágenes</option>
            <option value="video">Videos</option>
            <option value="document">Documentos</option>
          </NativeSelect>
        ) : null}
        <NativeSelect className="w-40" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} aria-label="Ubicación">
          <option value="all">Toda la biblioteca</option>
          <option value="shared">Compartidos</option>
          {pageId ? <option value="page">De esta página</option> : null}
          <option value="template">Plantillas</option>
        </NativeSelect>
        {can.edit ? (
          <>
            {pageId ? (
              <NativeSelect className="w-40" value={target} onChange={(e) => setTarget(e.target.value as "shared" | "page")} aria-label="Destino de subida">
                <option value="shared">Subir a: compartidos</option>
                <option value="page">Subir a: esta página</option>
              </NativeSelect>
            ) : null}
            <NativeSelect className="w-32" value={folder} onChange={(e) => setFolder(e.target.value as "auto" | MediaFolder)} aria-label="Carpeta">
              <option value="auto">Carpeta auto</option>
              <option value="logos">logos</option>
              <option value="icons">icons</option>
            </NativeSelect>
            <Button onClick={() => fileInput.current?.click()}>
              <Upload /> Subir archivos
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              accept={kinds ? ACCEPT_ATTR.split(",").filter((m) => kinds.some((k) => (k === "document" ? m === "application/pdf" : m.startsWith(k)))).join(",") : ACCEPT_ATTR}
              onChange={(e) => {
                if (e.target.files?.length) startUploads(e.target.files);
                e.target.value = "";
              }}
              data-testid="media-file-input"
            />
          </>
        ) : null}
      </div>

      {uploads.length ? (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3" aria-live="polite">
          {uploads.map((u) => (
            <div key={u.key} className="flex items-center gap-3 text-sm">
              <span className="w-48 truncate">{u.name}</span>
              {u.error ? (
                <span className="flex-1 text-destructive">{u.error}</span>
              ) : (
                <Progress value={u.percent} className="flex-1" />
              )}
              <span className="w-12 text-right tabular-nums">{u.done ? <Check className="ml-auto size-4 text-green-600" /> : `${u.percent}%`}</span>
              {!u.done && !u.error ? (
                <Button size="icon-xs" variant="ghost" aria-label="Cancelar subida" onClick={() => u.handle?.cancel()}>
                  <X />
                </Button>
              ) : u.error ? (
                <Button size="icon-xs" variant="ghost" aria-label="Descartar" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))}>
                  <X />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !items.length ? (
            <div className="grid h-40 place-items-center text-muted-foreground">
              <Loader2 className="animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-48 place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              <div>
                <Upload className="mx-auto mb-2 size-6" />
                No hay archivos. {can.edit ? "Arrastra archivos aquí o usa «Subir archivos»." : ""}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3" role="listbox" aria-label="Archivos multimedia">
              {filtered.map((m) => {
                const Icon = KIND_ICON[m.kind];
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={m.id === selectedId}
                    onClick={() => setSelectedId(m.id)}
                    onDoubleClick={() => mode === "pick" && onPick?.(m)}
                    className={cn(
                      "group overflow-hidden rounded-lg border bg-muted/30 text-left transition hover:border-primary",
                      m.id === selectedId && "ring-2 ring-primary",
                    )}
                    data-testid={`media-item-${m.id}`}
                  >
                    <div className="relative grid aspect-[4/3] place-items-center bg-muted">
                      {m.thumbUrl ? (
                        // Solo la miniatura (WebP ~480px), nunca el original.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumbUrl} alt={m.alt || m.displayName} loading="lazy" className="size-full object-cover" />
                      ) : (
                        <Icon className="size-8 text-muted-foreground" />
                      )}
                      {m.kind !== "image" ? (
                        <Badge variant="secondary" className="absolute top-1.5 left-1.5">
                          <Icon /> {m.kind === "video" ? "Video" : "PDF"}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="truncate px-2 py-1.5 text-xs">{m.displayName}</div>
                  </button>
                );
              })}
            </div>
          )}
          {cursor ? (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => load(cursor)} disabled={loading}>
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>

        {selected ? (
          <MediaDetails
            key={selected.id}
            media={selected}
            mode={mode}
            onPick={onPick}
            onChange={(patch) => patchItem(selected.id, patch)}
            onDeleted={() => {
              setItems((prev) => prev.filter((m) => m.id !== selected.id));
              setSelectedId(null);
            }}
            confirm={confirm}
          />
        ) : null}
      </div>
    </div>
  );
}

function MediaDetails({
  media,
  mode,
  onPick,
  onChange,
  onDeleted,
  confirm,
}: {
  media: MediaDoc;
  mode: "manage" | "pick";
  onPick?: (m: MediaDoc) => void;
  onChange: (patch: Partial<MediaDoc>) => void;
  onDeleted: () => void;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const { actor, can } = useAuth();
  const [displayName, setDisplayName] = useState(media.displayName);
  const [alt, setAlt] = useState(media.alt);
  const [tags, setTags] = useState((media.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [refs, setRefs] = useState<MediaReferences | null>(null);
  const [replacing, setReplacing] = useState<number | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const dirty = displayName !== media.displayName || alt !== media.alt || tags !== (media.tags ?? []).join(", ");

  async function save() {
    setSaving(true);
    try {
      const patch = { displayName: displayName.trim() || media.name, alt: alt.trim(), tags: tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) };
      await updateMediaMeta(db, media.id, patch);
      onChange({ ...patch, searchName: patch.displayName.toLowerCase() });
      toast.success("Metadatos guardados");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function checkRefs() {
    try {
      setRefs(await findMediaReferences(db, media.id));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onDelete() {
    try {
      const r = await findMediaReferences(db, media.id);
      setRefs(r);
      if (r.total > 0 && !can.admin) {
        toast.error(`No se puede eliminar: está en uso en ${r.total} lugar(es).`);
        return;
      }
      const ok = await confirm({
        title: r.total > 0 ? "Este archivo está en uso" : "¿Eliminar archivo?",
        description:
          r.total > 0 ? (
            <div className="space-y-2">
              <p>Se usa en {r.total} lugar(es). Si lo eliminas, esos bloques quedarán sin imagen y la publicación fallará hasta corregirlos.</p>
              <RefsList refs={r} />
            </div>
          ) : (
            "Se eliminará de Firebase Storage y de la biblioteca. Esta acción no se puede deshacer."
          ),
        confirmLabel: r.total > 0 ? "Eliminar de todos modos" : "Eliminar",
        destructive: true,
      });
      if (!ok) return;
      await deleteMedia(db, storage, media, { force: r.total > 0 });
      toast.success("Archivo eliminado");
      onDeleted();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  function onReplace(file: File) {
    if (!actor) return;
    setReplacing(0);
    const h = replaceMediaFile(db, storage, actor, media, file, (p) => setReplacing(p.percent));
    h.promise
      .then((m) => {
        onChange(m);
        toast.success("Archivo reemplazado. Vuelve a publicar las páginas que lo usan para actualizar la versión pública.");
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setReplacing(null));
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3 text-sm" aria-label="Detalles del archivo">
      <div className="grid aspect-video place-items-center overflow-hidden rounded-md bg-muted">
        {media.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.thumbUrl ?? media.url} alt={media.alt} className="size-full object-contain" />
        ) : media.kind === "video" ? (
          <video src={media.url} poster={media.thumbUrl ?? undefined} controls preload="none" className="size-full" />
        ) : (
          <FileText className="size-10 text-muted-foreground" />
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Tipo</dt>
        <dd className="truncate">{media.mime}</dd>
        <dt className="text-muted-foreground">Tamaño</dt>
        <dd>{formatBytes(media.size)}</dd>
        {media.width ? (
          <>
            <dt className="text-muted-foreground">Dimensiones</dt>
            <dd>
              {media.width} × {media.height}px
            </dd>
          </>
        ) : null}
        {media.duration ? (
          <>
            <dt className="text-muted-foreground">Duración</dt>
            <dd>{Math.round(media.duration)} s</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Subido</dt>
        <dd>{formatDate(media.createdAt)}</dd>
        <dt className="text-muted-foreground">Ruta</dt>
        <dd className="font-mono text-[10px] break-all">{media.path}</dd>
      </dl>
      {can.edit ? (
        <>
          <FormRow label="Nombre visible">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </FormRow>
          <FormRow label="Texto alternativo (accesibilidad)" hint="Describe la imagen para lectores de pantalla.">
            <Textarea rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} />
          </FormRow>
          <FormRow label="Etiquetas" hint="Separadas por comas">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </FormRow>
          <Button size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : null} Guardar cambios
          </Button>
        </>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(media.url);
            toast.success("URL copiada");
          }}
        >
          <Copy /> URL
        </Button>
        <Button size="sm" variant="outline" onClick={checkRefs}>
          <Link2 /> Usos
        </Button>
        {can.edit ? (
          <>
            <Button size="sm" variant="outline" disabled={replacing !== null} onClick={() => replaceInput.current?.click()}>
              {replacing !== null ? <Loader2 className="animate-spin" /> : <RefreshCw />} {replacing !== null ? `${replacing}%` : "Reemplazar"}
            </Button>
            <input
              ref={replaceInput}
              type="file"
              hidden
              accept={ACCEPT_ATTR}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onReplace(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 /> Eliminar
            </Button>
          </>
        ) : null}
      </div>
      {media.supersededPaths?.length && can.edit ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            try {
              await cleanupSuperseded(db, storage, media);
              onChange({ supersededPaths: [] });
              toast.success("Archivos antiguos eliminados");
            } catch (e) {
              toast.error(errorMessage(e));
            }
          }}
        >
          Limpiar {media.supersededPaths.length} archivo(s) reemplazado(s)
        </Button>
      ) : null}
      {refs ? <RefsList refs={refs} /> : null}
      {mode === "pick" ? (
        <Button className="mt-auto" onClick={() => onPick?.(media)} data-testid="media-pick-confirm">
          <Check /> Usar este archivo
        </Button>
      ) : null}
    </aside>
  );
}

function RefsList({ refs }: { refs: MediaReferences }) {
  if (!refs.total) return <p className="text-xs text-muted-foreground">No se usa en ninguna página, ajuste, plantilla ni bloque.</p>;
  return (
    <ul className="space-y-0.5 text-xs">
      {refs.pages.map((p) => (
        <li key={p.id}>Borrador: {p.name}</li>
      ))}
      {refs.published.map((s) => (
        <li key={s}>Publicada: /{s}</li>
      ))}
      {refs.settings.map((s) => (
        <li key={s}>Ajuste global: {s}</li>
      ))}
      {refs.templates.map((t) => (
        <li key={t.id}>Plantilla: {t.name}</li>
      ))}
      {refs.blocks.map((b) => (
        <li key={b.id}>Bloque: {b.name}</li>
      ))}
    </ul>
  );
}
