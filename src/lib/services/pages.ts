import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase/firestore";
import {
  PAGE_SCHEMA_VERSION,
  type DraftMeta,
  type MediaRef,
  type PageData,
  type PageDoc,
  type PublishedPageDoc,
  type SeoSettings,
  type VersionDoc,
  type VersionKind,
} from "@/lib/model/types";
import { joinChunks, serializeSnapshot } from "@/lib/serialization/chunks";
import {
  collectMediaIds,
  EMPTY_PAGE_DATA,
  mapMediaRefs,
  parsePageData,
  validatePageData,
  walkComponents,
  type ValidationIssue,
} from "@/lib/serialization/page-data";
import { slugify } from "@/lib/utils/slug";

export type Actor = { uid: string; email?: string | null };

export class DraftConflictError extends Error {
  constructor(
    public remoteRevision: number,
    public remoteUpdatedBy: string | undefined,
    public remoteUpdatedByEmail: string | undefined,
  ) {
    super("El borrador fue modificado por otra sesión.");
    this.name = "DraftConflictError";
  }
}

export class PublishValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super(issues.map((i) => i.message).join("\n"));
    this.name = "PublishValidationError";
  }
}

export const RESERVED_SLUGS = ["admin", "api", "preview", "_next", "login"];

// ---------- Referencias ----------
export const pageRef = (db: Firestore, pageId: string) => doc(db, "pages", pageId);
export const draftRef = (db: Firestore, pageId: string) => doc(db, "pages", pageId, "draft", "current");
const draftChunkRef = (db: Firestore, pageId: string, i: number) =>
  doc(db, "pages", pageId, "draft", "current", "chunks", String(i));
const versionRef = (db: Firestore, pageId: string, versionId: string) =>
  doc(db, "pages", pageId, "versions", versionId);
const versionChunkRef = (db: Firestore, pageId: string, versionId: string, i: number) =>
  doc(db, "pages", pageId, "versions", versionId, "chunks", String(i));
export const publishedRef = (db: Firestore, slug: string) => doc(db, "publishedPages", slug);
const publishedChunkRef = (db: Firestore, slug: string, i: number) =>
  doc(db, "publishedPages", slug, "chunks", String(i));

/** Elimina valores undefined (Firestore los rechaza) haciendo una copia JSON. */
export function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null));
}

export function emptySeo(title = ""): SeoSettings {
  return { title, description: "", ogImage: null, noindex: false };
}

// ---------- Lectura ----------
export async function listPages(db: Firestore): Promise<PageDoc[]> {
  const snap = await getDocs(query(collection(db, "pages"), orderBy("updatedAt", "desc"), limit(200)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PageDoc, "id">) }));
}

export async function getPage(db: Firestore, pageId: string): Promise<PageDoc | null> {
  const snap = await getDocFromServer(pageRef(db, pageId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<PageDoc, "id">) } as PageDoc) : null;
}

export function validateSlug(slug: string): string | null {
  if (!slug) return "El slug es obligatorio.";
  if (slug !== slugify(slug)) return "Usa solo minúsculas, números y guiones.";
  if (RESERVED_SLUGS.includes(slug)) return "Ese slug está reservado.";
  if (slug.length > 80) return "Máximo 80 caracteres.";
  return null;
}

export async function isSlugAvailable(db: Firestore, slug: string, exceptPageId?: string) {
  const [pages, published] = await Promise.all([
    getDocsFromServer(query(collection(db, "pages"), where("slug", "==", slug), limit(2))),
    getDocFromServer(publishedRef(db, slug)).catch(() => null),
  ]);
  if (pages.docs.some((d) => d.id !== exceptPageId)) return false;
  if (published?.exists() && published.data().pageId !== exceptPageId) return false;
  return true;
}

async function readChunks(refs: DocumentReference[], tx?: Transaction): Promise<string> {
  const snaps = await Promise.all(refs.map((r) => (tx ? tx.get(r) : getDocFromServer(r))));
  const chunks = snaps.map((s, i) => {
    if (!s.exists()) throw new Error(`Falta el fragmento ${i} del contenido.`);
    return s.data() as { index: number; json: string };
  });
  return joinChunks(chunks);
}

function draftChunkRefs(db: Firestore, pageId: string, count: number) {
  return Array.from({ length: count }, (_, i) => draftChunkRef(db, pageId, i));
}

export type LoadedDraft = { data: PageData; revision: number; meta: DraftMeta | null };

export async function loadDraft(db: Firestore, pageId: string): Promise<LoadedDraft> {
  const snap = await getDocFromServer(draftRef(db, pageId));
  if (!snap.exists()) return { data: structuredClone(EMPTY_PAGE_DATA), revision: 0, meta: null };
  const meta = snap.data() as DraftMeta;
  const json = meta.inline ?? (await readChunks(draftChunkRefs(db, pageId, meta.chunkCount)));
  return { data: parsePageData(json), revision: meta.revision, meta };
}

async function loadDraftInTx(db: Firestore, tx: Transaction, pageId: string) {
  const snap = await tx.get(draftRef(db, pageId));
  if (!snap.exists()) return { meta: null as DraftMeta | null, json: JSON.stringify(EMPTY_PAGE_DATA) };
  const meta = snap.data() as DraftMeta;
  const json = meta.inline ?? (await readChunks(draftChunkRefs(db, pageId, meta.chunkCount), tx));
  return { meta, json };
}

// ---------- Escritura del borrador ----------
function writeDraftInTx(
  db: Firestore,
  tx: Transaction,
  actor: Actor,
  pageId: string,
  data: PageData,
  previous: DraftMeta | null,
) {
  const snapshot = serializeSnapshot(data);
  const revision = (previous?.revision ?? 0) + 1;
  tx.set(draftRef(db, pageId), {
    revision,
    chunkCount: snapshot.chunkCount,
    inline: snapshot.inline,
    byteSize: snapshot.byteSize,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByEmail: actor.email ?? null,
  });
  snapshot.chunks.forEach((json, index) => tx.set(draftChunkRef(db, pageId, index), { index, json }));
  // Elimina fragmentos sobrantes de una revisión anterior más grande.
  const previousChunks = previous && !previous.inline ? previous.chunkCount : 0;
  const keep = snapshot.inline ? 0 : snapshot.chunkCount;
  for (let i = keep; i < previousChunks; i++) tx.delete(draftChunkRef(db, pageId, i));
  tx.update(pageRef(db, pageId), {
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    draftRevision: revision,
    hasUnpublishedChanges: true,
    mediaRefs: collectMediaIds(data),
  });
  return revision;
}

/**
 * Guarda el borrador si la revisión remota coincide con `baseRevision`.
 * Si otra sesión guardó antes, lanza DraftConflictError (no sobrescribe).
 */
export async function saveDraft(
  db: Firestore,
  actor: Actor,
  pageId: string,
  data: PageData,
  baseRevision: number,
  opts: { force?: boolean } = {},
): Promise<number> {
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(draftRef(db, pageId));
    const previous = snap.exists() ? (snap.data() as DraftMeta) : null;
    const remoteRevision = previous?.revision ?? 0;
    if (!opts.force && remoteRevision !== baseRevision) {
      throw new DraftConflictError(remoteRevision, previous?.updatedBy, previous?.updatedByEmail);
    }
    return writeDraftInTx(db, tx, actor, pageId, data, previous);
  });
}

// ---------- Creación / metadatos ----------
export type CreatePageInput = {
  name: string;
  slug: string;
  data?: PageData;
  templateId?: string | null;
  seo?: Partial<SeoSettings>;
  /** Id fijo (datos de demostración). Si se omite se genera uno. */
  id?: string;
};

export async function createPage(db: Firestore, actor: Actor, input: CreatePageInput): Promise<string> {
  const slugError = validateSlug(input.slug);
  if (slugError) throw new Error(slugError);
  if (!(await isSlugAvailable(db, input.slug))) throw new Error(`El slug "${input.slug}" ya está en uso.`);

  const ref = input.id ? pageRef(db, input.id) : doc(collection(db, "pages"));
  const data = input.data ?? structuredClone(EMPTY_PAGE_DATA);
  const snapshot = serializeSnapshot(data);
  const batch = writeBatch(db);
  batch.set(ref, {
    schemaVersion: PAGE_SCHEMA_VERSION,
    name: input.name.trim(),
    slug: input.slug,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: actor.uid,
    updatedBy: actor.uid,
    seo: clean({ ...emptySeo(input.name.trim()), ...input.seo }),
    coverImage: null,
    templateId: input.templateId ?? null,
    draftRevision: 1,
    hasUnpublishedChanges: true,
    publishedVersionId: null,
    publishedSlug: null,
    publishedAt: null,
    versionCount: 0,
    mediaRefs: collectMediaIds(data),
  });
  batch.set(doc(db, "pages", ref.id, "draft", "current"), {
    revision: 1,
    chunkCount: snapshot.chunkCount,
    inline: snapshot.inline,
    byteSize: snapshot.byteSize,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    updatedByEmail: actor.email ?? null,
  });
  snapshot.chunks.forEach((json, index) => batch.set(draftChunkRef(db, ref.id, index), { index, json }));
  await batch.commit();
  return ref.id;
}

export type PageMetaPatch = Partial<Pick<PageDoc, "name" | "slug" | "seo" | "coverImage">>;

export async function updatePageMeta(db: Firestore, actor: Actor, pageId: string, patch: PageMetaPatch) {
  if (patch.slug !== undefined) {
    const err = validateSlug(patch.slug);
    if (err) throw new Error(err);
    if (!(await isSlugAvailable(db, patch.slug, pageId))) throw new Error(`El slug "${patch.slug}" ya está en uso.`);
  }
  const batch = writeBatch(db);
  batch.update(pageRef(db, pageId), {
    ...clean(patch),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
    hasUnpublishedChanges: true,
  });
  await batch.commit();
}

export async function duplicatePage(db: Firestore, actor: Actor, pageId: string, name: string, slug: string) {
  const [page, draft] = await Promise.all([getPage(db, pageId), loadDraft(db, pageId)]);
  if (!page) throw new Error("Página no encontrada");
  const { clonePageWithNewIds } = await import("@/lib/serialization/page-data");
  return createPage(db, actor, {
    name,
    slug,
    data: clonePageWithNewIds(draft.data),
    templateId: page.templateId,
    seo: { ...page.seo, title: name },
  });
}

/** Elimina página, borrador, versiones y snapshot publicado (solo admin por reglas). */
export async function deletePage(db: Firestore, pageId: string) {
  const page = await getPage(db, pageId);
  if (!page) return;
  const refs: DocumentReference[] = [];
  const draftSnap = await getDocFromServer(draftRef(db, pageId));
  if (draftSnap.exists()) {
    const meta = draftSnap.data() as DraftMeta;
    if (!meta.inline) refs.push(...draftChunkRefs(db, pageId, meta.chunkCount));
    refs.push(draftRef(db, pageId));
  }
  const versions = await getDocsFromServer(collection(db, "pages", pageId, "versions"));
  for (const v of versions.docs) {
    const count = (v.data() as VersionDoc).chunkCount;
    for (let i = 0; i < count; i++) refs.push(versionChunkRef(db, pageId, v.id, i));
    refs.push(v.ref);
  }
  if (page.publishedSlug) {
    const pub = await getDocFromServer(publishedRef(db, page.publishedSlug));
    if (pub.exists() && pub.data().pageId === pageId) {
      const p = pub.data() as PublishedPageDoc;
      if (!p.inline) for (let i = 0; i < p.chunkCount; i++) refs.push(publishedChunkRef(db, page.publishedSlug, i));
      refs.push(pub.ref);
    }
  }
  refs.push(pageRef(db, pageId));
  // Lotes de 450 operaciones (límite de Firestore: 500).
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

// ---------- Versiones ----------
export async function listVersions(db: Firestore, pageId: string): Promise<VersionDoc[]> {
  const snap = await getDocsFromServer(
    query(collection(db, "pages", pageId, "versions"), orderBy("number", "desc"), limit(100)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VersionDoc, "id">) }));
}

export async function loadVersion(db: Firestore, pageId: string, versionId: string) {
  const snap = await getDocFromServer(versionRef(db, pageId, versionId));
  if (!snap.exists()) throw new Error("Versión no encontrada");
  const meta = { id: snap.id, ...(snap.data() as Omit<VersionDoc, "id">) };
  const json = await readChunks(
    Array.from({ length: meta.chunkCount }, (_, i) => versionChunkRef(db, pageId, versionId, i)),
  );
  return { meta, data: parsePageData(json) };
}

function writeVersionInTx(
  db: Firestore,
  tx: Transaction,
  actor: Actor,
  pageId: string,
  page: PageDoc,
  data: PageData,
  kind: VersionKind,
  note: string,
  draftRevision: number,
) {
  const ref = doc(collection(db, "pages", pageId, "versions"));
  // Las versiones siempre se fragmentan: el listado del historial no descarga contenido.
  const json = JSON.stringify(data);
  const snapshot = serializeSnapshot(data);
  const parts = snapshot.inline ? [json] : snapshot.chunks;
  const number = (page.versionCount ?? 0) + 1;
  tx.set(ref, {
    number,
    kind,
    note,
    slug: page.slug,
    seo: clean(page.seo),
    chunkCount: parts.length,
    byteSize: snapshot.byteSize,
    createdAt: serverTimestamp(),
    createdBy: actor.uid,
    createdByEmail: actor.email ?? null,
    draftRevision,
  });
  parts.forEach((part, index) => tx.set(versionChunkRef(db, pageId, ref.id, index), { index, json: part }));
  return { id: ref.id, number };
}

/** Guarda el borrador actual como versión manual (punto de restauración). */
export async function createManualVersion(db: Firestore, actor: Actor, pageId: string, note: string) {
  return runTransaction(db, async (tx) => {
    const pageSnap = await tx.get(pageRef(db, pageId));
    if (!pageSnap.exists()) throw new Error("Página no encontrada");
    const page = { id: pageId, ...(pageSnap.data() as Omit<PageDoc, "id">) } as PageDoc;
    const { meta, json } = await loadDraftInTx(db, tx, pageId);
    const v = writeVersionInTx(db, tx, actor, pageId, page, parsePageData(json), "manual", note, meta?.revision ?? 0);
    tx.update(pageRef(db, pageId), { versionCount: v.number, updatedAt: serverTimestamp(), updatedBy: actor.uid });
    return v;
  });
}

/**
 * Restaura una versión como nuevo borrador. Antes guarda una copia de seguridad del
 * borrador actual. No modifica la página publicada.
 */
export async function restoreVersion(
  db: Firestore,
  actor: Actor,
  pageId: string,
  versionId: string,
  baseRevision?: number,
) {
  const { data, meta: vmeta } = await loadVersion(db, pageId, versionId);
  return runTransaction(db, async (tx) => {
    const pageSnap = await tx.get(pageRef(db, pageId));
    if (!pageSnap.exists()) throw new Error("Página no encontrada");
    const page = { id: pageId, ...(pageSnap.data() as Omit<PageDoc, "id">) } as PageDoc;
    const { meta, json } = await loadDraftInTx(db, tx, pageId);
    if (baseRevision !== undefined && (meta?.revision ?? 0) !== baseRevision) {
      throw new DraftConflictError(meta?.revision ?? 0, meta?.updatedBy, meta?.updatedByEmail);
    }
    const backup = writeVersionInTx(
      db, tx, actor, pageId, page, parsePageData(json), "backup",
      `Copia automática antes de restaurar la versión ${vmeta.number}`, meta?.revision ?? 0,
    );
    const revision = writeDraftInTx(db, tx, actor, pageId, data, meta);
    tx.update(pageRef(db, pageId), { versionCount: backup.number });
    return { revision, backupVersionId: backup.id };
  });
}

// ---------- Publicación ----------
export type MediaLookup = (ids: string[]) => Promise<Map<string, MediaRef & { exists: boolean }>>;
export type SharedBlockLookup = (ids: string[]) => Promise<Map<string, unknown>>;

/** Busca documentos de media por id (para validar y refrescar URLs). */
export function firestoreMediaLookup(db: Firestore): MediaLookup {
  return async (ids) => {
    const result = new Map<string, MediaRef & { exists: boolean }>();
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "media", id))));
    snaps.forEach((s, i) => {
      if (!s.exists()) {
        result.set(ids[i], { url: "", exists: false });
        return;
      }
      const m = s.data();
      result.set(ids[i], {
        mediaId: s.id,
        path: m.path,
        url: m.url,
        thumbUrl: m.thumbUrl ?? undefined,
        mime: m.mime,
        kind: m.kind,
        width: m.width ?? undefined,
        height: m.height ?? undefined,
        exists: true,
      });
    });
    return result;
  };
}

export function firestoreSharedBlockLookup(db: Firestore): SharedBlockLookup {
  return async (ids) => {
    const result = new Map<string, unknown>();
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "savedBlocks", id))));
    snaps.forEach((s) => {
      if (s.exists()) result.set(s.id, JSON.parse(s.data().json));
    });
    return result;
  };
}

/**
 * Prepara el snapshot público: valida estructura, comprueba que existan los recursos,
 * refresca URLs multimedia desde Firestore e incrusta bloques compartidos.
 */
export async function preparePublishSnapshot(
  data: PageData,
  lookups: { media: MediaLookup; sharedBlocks: SharedBlockLookup },
): Promise<PageData> {
  const issues = validatePageData(data);

  // Bloques compartidos: se resuelven al publicar para que el snapshot sea autónomo.
  const sharedIds = new Set<string>();
  walkComponents(data, (n) => {
    if (n.type === "SharedBlock" && typeof n.props.blockId === "string") sharedIds.add(n.props.blockId);
  });
  const blocks = sharedIds.size ? await lookups.sharedBlocks([...sharedIds]) : new Map();
  const resolved = structuredClone(data);
  walkComponents(resolved, (n) => {
    if (n.type !== "SharedBlock") return;
    const block = blocks.get(n.props.blockId as string);
    if (!block) issues.push({ componentId: n.props.id, type: n.type, message: "El bloque compartido ya no existe" });
    n.props.resolved = block ?? null;
  });

  const mediaIds = collectMediaIds(resolved);
  const media = mediaIds.length ? await lookups.media(mediaIds) : new Map();
  for (const id of mediaIds) {
    if (!media.get(id)?.exists) issues.push({ message: `Recurso multimedia no encontrado: ${id}` });
  }
  if (issues.length) throw new PublishValidationError(issues);

  return mapMediaRefs(resolved, (ref) => {
    const m = media.get(ref.mediaId);
    if (!m?.exists) return ref;
    const { exists: _exists, ...fresh } = m;
    return { ...ref, ...clean(fresh), alt: ref.alt };
  });
}

export type PublishResult = { versionId: string; versionNumber: number; slug: string; previousSlug: string | null };

export async function publishPage(
  db: Firestore,
  actor: Actor,
  pageId: string,
  opts: { expectedRevision?: number; note?: string; lookups?: { media: MediaLookup; sharedBlocks: SharedBlockLookup } } = {},
): Promise<PublishResult> {
  const lookups = opts.lookups ?? { media: firestoreMediaLookup(db), sharedBlocks: firestoreSharedBlockLookup(db) };
  // 1-2. Validar estructura y recursos con el borrador guardado.
  const draft = await loadDraft(db, pageId);
  if (opts.expectedRevision !== undefined && draft.revision !== opts.expectedRevision) {
    throw new DraftConflictError(draft.revision, draft.meta?.updatedBy, draft.meta?.updatedByEmail);
  }
  const publicData = await preparePublishSnapshot(draft.data, lookups);

  // 3-5. Versión + snapshot público + estado, en una transacción.
  return runTransaction(db, async (tx) => {
    const pageSnap = await tx.get(pageRef(db, pageId));
    if (!pageSnap.exists()) throw new Error("Página no encontrada");
    const page = { id: pageId, ...(pageSnap.data() as Omit<PageDoc, "id">) } as PageDoc;
    const draftSnap = await tx.get(draftRef(db, pageId));
    const currentRevision = draftSnap.exists() ? (draftSnap.data() as DraftMeta).revision : 0;
    if (currentRevision !== draft.revision) {
      const m = draftSnap.data() as DraftMeta | undefined;
      throw new DraftConflictError(currentRevision, m?.updatedBy, m?.updatedByEmail);
    }
    const slug = page.slug;
    const target = await tx.get(publishedRef(db, slug));
    if (target.exists() && target.data().pageId !== pageId) {
      throw new Error(`El slug "${slug}" ya está publicado por otra página.`);
    }
    const previousSlug = page.publishedSlug && page.publishedSlug !== slug ? page.publishedSlug : null;
    const previous = previousSlug ? await tx.get(publishedRef(db, previousSlug)) : null;

    const version = writeVersionInTx(db, tx, actor, pageId, page, publicData, "publish", opts.note ?? "", draft.revision);

    const snapshot = serializeSnapshot(publicData);
    const publishedDoc = {
      slug,
      pageId,
      versionId: version.id,
      name: page.name,
      seo: clean(page.seo),
      chunkCount: snapshot.chunkCount,
      inline: snapshot.inline,
      byteSize: snapshot.byteSize,
      mediaRefs: collectMediaIds(publicData),
      publishedAt: serverTimestamp(),
      publishedBy: actor.uid,
      schemaVersion: PAGE_SCHEMA_VERSION,
    };
    tx.set(publishedRef(db, slug), publishedDoc);
    snapshot.chunks.forEach((json, index) => tx.set(publishedChunkRef(db, slug, index), { index, json }));
    if (target.exists()) {
      const old = target.data() as PublishedPageDoc;
      const keep = snapshot.inline ? 0 : snapshot.chunkCount;
      const had = old.inline ? 0 : old.chunkCount;
      for (let i = keep; i < had; i++) tx.delete(publishedChunkRef(db, slug, i));
    }
    if (previous?.exists() && previous.data().pageId === pageId) {
      const old = previous.data() as PublishedPageDoc;
      if (!old.inline) for (let i = 0; i < old.chunkCount; i++) tx.delete(publishedChunkRef(db, previousSlug!, i));
      tx.delete(publishedRef(db, previousSlug!));
    }
    tx.update(pageRef(db, pageId), {
      status: "published",
      publishedVersionId: version.id,
      publishedSlug: slug,
      publishedAt: serverTimestamp(),
      hasUnpublishedChanges: false,
      versionCount: version.number,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });
    return { versionId: version.id, versionNumber: version.number, slug, previousSlug };
  });
}

export async function unpublishPage(db: Firestore, actor: Actor, pageId: string) {
  return runTransaction(db, async (tx) => {
    const pageSnap = await tx.get(pageRef(db, pageId));
    if (!pageSnap.exists()) throw new Error("Página no encontrada");
    const page = pageSnap.data() as PageDoc;
    const slug = page.publishedSlug;
    if (slug) {
      const pub = await tx.get(publishedRef(db, slug));
      if (pub.exists() && pub.data().pageId === pageId) {
        const old = pub.data() as PublishedPageDoc;
        if (!old.inline) for (let i = 0; i < old.chunkCount; i++) tx.delete(publishedChunkRef(db, slug, i));
        tx.delete(publishedRef(db, slug));
      }
    }
    tx.update(pageRef(db, pageId), {
      status: "unpublished",
      publishedSlug: null,
      publishedVersionId: null,
      hasUnpublishedChanges: true,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });
    return slug;
  });
}

/** Lee la versión publicada con el SDK completo (pruebas / vista de comparación). */
export async function loadPublishedWithClient(db: Firestore, slug: string) {
  const snap = await getDocFromServer(publishedRef(db, slug));
  if (!snap.exists()) return null;
  const meta = snap.data() as PublishedPageDoc;
  const json =
    meta.inline ??
    (await readChunks(Array.from({ length: meta.chunkCount }, (_, i) => publishedChunkRef(db, slug, i))));
  return { meta, data: parsePageData(json) };
}
