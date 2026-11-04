"use client";

import "@puckeditor/core/puck.css";
import { createUsePuck, Puck, type Data } from "@puckeditor/core";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, getDocFromServer } from "firebase/firestore";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Blocks, BookmarkPlus, CheckCircle2, CloudOff, Eye, History, Loader2, Rocket, Save, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PUCK_DICTIONARY, VIEWPORTS, puckConfig } from "@/builder/editor/config";
import { EditorContext } from "@/builder/editor/context";
import { db } from "@/lib/firebase/client";
import type { GlobalSettings } from "@/lib/model/settings";
import type { DraftMeta, PageData, PageDoc, SavedBlockDoc } from "@/lib/model/types";
import { listSavedBlocks, saveBlock, saveTemplate } from "@/lib/services/library";
import { DraftConflictError, getPage, loadDraft, PublishValidationError, saveDraft } from "@/lib/services/pages";
import { loadSettings } from "@/lib/services/settings";
import type { ComponentNode } from "@/lib/serialization/page-data";
import { useAuth } from "../auth";
import { MediaScopeContext } from "../media/MediaField";
import { publishAndRevalidate } from "../publish";
import { errorMessage, formatDate } from "../ui";
import { PageSettingsDialog } from "./PageSettingsDialog";
import { SavedBlocksPanel } from "./SavedBlocksPanel";

const usePuck = createUsePuck();
const AUTOSAVE_MS = 2500;

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict" | "readonly";

type Loaded = { page: PageDoc; data: PageData; revision: number; meta: DraftMeta | null; settings: GlobalSettings; blocks: SavedBlockDoc[] };

export function PageEditor({ pageId }: { pageId: string }) {
  const { actor, can, getIdToken } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [puckKey, setPuckKey] = useState(0);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [page, draft, settings, blocks] = await Promise.all([
        getPage(db, pageId),
        loadDraft(db, pageId),
        loadSettings(db, "drafts"),
        listSavedBlocks(db).catch(() => [] as SavedBlockDoc[]),
      ]);
      if (!page) throw new Error("La página no existe o no tienes acceso.");
      setLoaded({ page, data: draft.data, revision: draft.revision, meta: draft.meta, settings: settings.settings, blocks });
      setPuckKey((k) => k + 1);
    } catch (e) {
      setLoadError(errorMessage(e));
    }
  }, [pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded?.meta || !actor) return;
    const updatedAt = (loaded.meta.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
    if (loaded.meta.updatedBy !== actor.uid && Date.now() - updatedAt < 10 * 60_000) {
      toast.warning(`${loaded.meta.updatedByEmail ?? "Otro usuario"} editó esta página hace poco. Si sigue editando, se detectarán conflictos al guardar.`);
    }
  }, [loaded?.meta, actor]);

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-destructive">{loadError}</p>
          <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
            Volver
          </Button>
        </div>
      </div>
    );
  }
  if (!loaded || !actor) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  return <EditorSession key={puckKey} loaded={loaded} onReload={load} canEdit={can.edit} canPublish={can.publish} actor={actor} getIdToken={getIdToken} />;
}

function EditorSession({
  loaded,
  onReload,
  canEdit,
  canPublish,
  actor,
  getIdToken,
}: {
  loaded: Loaded;
  onReload: () => Promise<void>;
  canEdit: boolean;
  canPublish: boolean;
  actor: { uid: string; email?: string | null };
  getIdToken: () => Promise<string | null>;
}) {
  const pageId = loaded.page.id;
  const [page, setPage] = useState(loaded.page);
  const [blocks, setBlocks] = useState(loaded.blocks);
  const [status, setStatus] = useState<SaveStatus>(canEdit ? "saved" : "readonly");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [conflict, setConflictState] = useState<{ error: DraftConflictError; localRevision: number } | null>(null);
  const [issues, setIssues] = useState<string[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const latest = useRef<Data>(loaded.data);
  const savedJson = useRef(JSON.stringify(loaded.data));
  const revision = useRef(loaded.revision);
  const saving = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const blocked = useRef(false);
  const setConflict = useCallback((e: DraftConflictError | null) => setConflictState(e ? { error: e, localRevision: revision.current } : null), []);

  const save = useCallback(
    async (opts: { force?: boolean } = {}): Promise<boolean> => {
      if (!canEdit) return false;
      if (saving.current) {
        await saving.current;
      }
      clearTimeout(timer.current);
      const data = latest.current;
      const json = JSON.stringify(data);
      if (json === savedJson.current && !opts.force) {
        setStatus("saved");
        return true;
      }
      if (blocked.current && !opts.force) return false;
      setStatus("saving");
      const run = (async () => {
        try {
          const rev = await saveDraft(db, actor, pageId, data as PageData, revision.current, { force: opts.force });
          revision.current = rev;
          savedJson.current = json;
          blocked.current = false;
          setLastSaved(new Date());
          setStatus(JSON.stringify(latest.current) === json ? "saved" : "dirty");
          setPage((p) => ({ ...p, hasUnpublishedChanges: true }));
          return true;
        } catch (e) {
          if (e instanceof DraftConflictError) {
            blocked.current = true;
            setConflict(e);
            setStatus("conflict");
          } else {
            setStatus("error");
            toast.error(`No se pudo guardar: ${errorMessage(e)}`);
          }
          return false;
        }
      })();
      saving.current = run;
      const ok = await run;
      saving.current = null;
      return ok;
    },
    [actor, canEdit, pageId, setConflict],
  );

  const onChange = useCallback(
    (data: Data) => {
      latest.current = data;
      if (!canEdit || blocked.current) return;
      if (JSON.stringify(data) === savedJson.current) return;
      setStatus("dirty");
      clearTimeout(timer.current);
      // Debounce: se escribe en Firestore al dejar de editar, nunca en cada movimiento.
      timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
    },
    [canEdit, save],
  );

  // Ctrl/Cmd+S, aviso al cerrar con cambios y comprobación de conflictos al volver a la pestaña.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== savedJson.current) {
        e.preventDefault();
      }
    };
    const onFocus = async () => {
      if (!canEdit || blocked.current) return;
      try {
        const snap = await getDocFromServer(doc(db, "pages", pageId, "draft", "current"));
        const remote = snap.exists() ? (snap.data() as DraftMeta) : null;
        if (remote && remote.revision !== revision.current && !saving.current) {
          blocked.current = true;
          setConflict(new DraftConflictError(remote.revision, remote.updatedBy, remote.updatedByEmail));
          setStatus("conflict");
        }
      } catch {
        /* sin conexión: se reintentará al guardar */
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer.current);
    };
  }, [save, canEdit, pageId, setConflict]);

  async function publish() {
    setPublishing(true);
    try {
      // Primero se guarda el borrador: se publica exactamente lo que se ve en el editor.
      if (!(await save())) return;
      const res = await publishAndRevalidate(actor, getIdToken, pageId, revision.current);
      setPage((p) => ({ ...p, status: "published", publishedSlug: res.slug, publishedVersionId: res.versionId, hasUnpublishedChanges: false, versionCount: res.versionNumber }));
      toast.success(`Publicada la versión ${res.versionNumber}`, {
        description: res.revalidated ? `Disponible en /${res.slug}` : `Disponible en /${res.slug} (la caché se actualizará en unos segundos)`,
        action: { label: "Ver", onClick: () => window.open(`/${res.slug}`, "_blank") },
      });
    } catch (e) {
      if (e instanceof PublishValidationError) setIssues(e.issues.map((i) => i.message));
      else if (e instanceof DraftConflictError) {
        blocked.current = true;
        setConflict(e);
        setStatus("conflict");
      } else toast.error(errorMessage(e));
    } finally {
      setPublishing(false);
    }
  }

  const ctx = useMemo(() => ({ pageId, settings: loaded.settings, savedBlocks: blocks, readOnly: !canEdit }), [pageId, loaded.settings, blocks, canEdit]);

  const readOnlyPermissions = { drag: false, duplicate: false, delete: false, edit: false, insert: false };

  return (
    <EditorContext.Provider value={ctx}>
      <MediaScopeContext.Provider value={{ pageId }}>
        <div className="h-screen" data-testid="page-editor">
          <Puck
            config={puckConfig}
            data={loaded.data}
            onChange={onChange}
            viewports={VIEWPORTS}
            iframe={{ enabled: true, waitForStyles: true }}
            dictionary={PUCK_DICTIONARY}
            permissions={canEdit ? undefined : readOnlyPermissions}
            headerTitle={page.name}
            headerPath={`/${page.slug}`}
            plugins={[
              {
                name: "saved-blocks",
                label: "Guardados",
                icon: <Blocks />,
                render: () => <SavedBlocksPanel />,
              },
            ]}
            overrides={{
              headerActions: () => (
                <HeaderActions
                  page={page}
                  status={status}
                  lastSaved={lastSaved}
                  canEdit={canEdit}
                  canPublish={canPublish}
                  publishing={publishing}
                  onSave={() => void save()}
                  onPublish={publish}
                  onSettings={() => setSettingsOpen(true)}
                  onBlockSaved={(b) => setBlocks((prev) => [...prev, b].sort((x, y) => x.name.localeCompare(y.name)))}
                  actor={actor}
                />
              ),
            }}
          />
        </div>

        <PageSettingsDialog page={page} open={settingsOpen} onOpenChange={setSettingsOpen} onSaved={setPage} />

        <Dialog open={!!conflict} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" /> Conflicto de edición
              </DialogTitle>
              <DialogDescription>
                {conflict?.error.remoteUpdatedByEmail ?? "Otra sesión"} guardó una versión más reciente de este borrador (revisión {conflict?.error.remoteRevision}, la tuya es {conflict?.localRevision}). Para no
                perder trabajo, elige qué hacer:
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button variant="outline" onClick={() => void onReload()}>
                Cargar la versión del servidor (descartar mis cambios)
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setConflict(null);
                  blocked.current = false;
                  const ok = await save({ force: true });
                  if (ok) toast.success("Tus cambios sobrescribieron la versión del servidor");
                }}
              >
                Sobrescribir con mis cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!issues} onOpenChange={(o) => !o && setIssues(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No se puede publicar</DialogTitle>
              <DialogDescription>Corrige estos problemas y vuelve a intentarlo. La versión pública no se modificó.</DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {issues?.map((i, k) => (
                <li key={k}>{i}</li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </MediaScopeContext.Provider>
    </EditorContext.Provider>
  );
}

function StatusBadge({ status, lastSaved }: { status: SaveStatus; lastSaved: Date | null }) {
  const map = {
    saved: { label: lastSaved ? `Guardado ${lastSaved.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}` : "Guardado", icon: <CheckCircle2 className="text-green-600" /> },
    dirty: { label: "Cambios sin guardar", icon: <Save className="text-amber-500" /> },
    saving: { label: "Guardando…", icon: <Loader2 className="animate-spin" /> },
    error: { label: "Error al guardar", icon: <CloudOff className="text-destructive" /> },
    conflict: { label: "Conflicto", icon: <AlertTriangle className="text-amber-500" /> },
    readonly: { label: "Solo lectura", icon: <Eye /> },
  }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5" data-testid="save-status" data-status={status} role="status">
      {map.icon}
      {map.label}
    </span>
  );
}

function HeaderActions(props: {
  page: PageDoc;
  status: SaveStatus;
  lastSaved: Date | null;
  canEdit: boolean;
  canPublish: boolean;
  publishing: boolean;
  onSave: () => void;
  onPublish: () => void;
  onSettings: () => void;
  onBlockSaved: (b: SavedBlockDoc) => void;
  actor: { uid: string; email?: string | null };
}) {
  const selected = usePuck((s) => s.selectedItem);
  const getData = usePuck((s) => s.appState.data);
  const [blockOpen, setBlockOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const { page } = props;

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/admin" />} title="Volver al listado">
        <ArrowLeft />
      </Button>
      <StatusBadge status={props.status} lastSaved={props.lastSaved} />
      {page.status === "published" ? (
        <Badge variant={page.hasUnpublishedChanges ? "outline" : "secondary"}>{page.hasUnpublishedChanges ? "Publicada · borrador con cambios" : "Publicada"}</Badge>
      ) : (
        <Badge variant="outline">{page.status === "unpublished" ? "Despublicada" : "Borrador"}</Badge>
      )}
      {props.canEdit ? (
        <Button size="sm" variant="outline" onClick={props.onSave} disabled={props.status === "saving"} title="Guardar borrador (Ctrl+S)">
          <Save /> Guardar
        </Button>
      ) : null}
      {props.canEdit ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!selected}
          title={selected ? "Guardar el bloque seleccionado para reutilizarlo" : "Selecciona un bloque"}
          onClick={() => {
            setName(String((selected?.props as { text?: string })?.text ?? selected?.type ?? "Bloque").slice(0, 60));
            setBlockOpen(true);
          }}
        >
          <BookmarkPlus /> Guardar bloque
        </Button>
      ) : null}
      <Button size="sm" variant="outline" onClick={props.onSettings}>
        <Settings /> Ajustes
      </Button>
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/admin/pages/${page.id}/versions`} target="_blank" />}>
        <History /> Versiones
      </Button>
      <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/preview/${page.id}`} target="_blank" rel="noreferrer" />}>
        <Eye /> Vista previa
      </Button>
      {props.canEdit ? (
        <Button size="sm" variant="ghost" onClick={() => { setName(`${page.name} (plantilla)`); setTemplateOpen(true); }}>
          Guardar como plantilla
        </Button>
      ) : null}
      {props.canPublish ? (
        <Button size="sm" onClick={props.onPublish} disabled={props.publishing || props.status === "conflict"} data-testid="publish-button">
          {props.publishing ? <Loader2 className="animate-spin" /> : <Rocket />} Publicar
        </Button>
      ) : null}

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar bloque</DialogTitle>
            <DialogDescription>Se guarda en Firestore para insertarlo en otras páginas.</DialogDescription>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del bloque" aria-label="Nombre del bloque" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            <span>
              Permitir insertarlo como <strong>vinculado</strong>: las páginas que lo vinculen reflejarán los cambios del bloque al republicarse.
              Siempre puede insertarse también como copia independiente.
            </span>
          </label>
          <DialogFooter>
            <Button
              disabled={!name.trim() || busy || !selected}
              onClick={async () => {
                if (!selected) return;
                setBusy(true);
                try {
                  const node = selected as unknown as ComponentNode;
                  const id = await saveBlock(db, props.actor, { name: name.trim(), node, shared });
                  props.onBlockSaved({ id, name: name.trim(), json: JSON.stringify(node), shared, mediaRefs: [], createdBy: props.actor.uid, createdAt: null, updatedAt: null });
                  toast.success("Bloque guardado");
                  setBlockOpen(false);
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar como plantilla</DialogTitle>
            <DialogDescription>Las nuevas páginas podrán crearse a partir de esta estructura. Última edición: {formatDate(page.updatedAt)}.</DialogDescription>
          </DialogHeader>
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre de la plantilla" />
          <DialogFooter>
            <Button
              disabled={!name.trim() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await saveTemplate(db, props.actor, { name: name.trim(), category: "personalizada", description: `Creada desde «${page.name}»`, data: getData as PageData });
                  toast.success("Plantilla guardada");
                  setTemplateOpen(false);
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Guardar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
