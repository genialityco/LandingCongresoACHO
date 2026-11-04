import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  type FirebaseStorage,
} from "firebase/storage";
import type { MediaDoc, MediaKind, MediaRef } from "@/lib/model/types";
import type { Actor } from "./pages";

// ---------- Validación ----------
const MB = 1024 * 1024;

export const MEDIA_RULES: Record<MediaKind, { mimes: string[]; exts: string[]; maxBytes: number }> = {
  image: { mimes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"], exts: ["png", "jpg", "jpeg", "webp", "gif", "avif"], maxBytes: 10 * MB },
  video: { mimes: ["video/mp4", "video/webm", "video/quicktime", "video/ogg"], exts: ["mp4", "webm", "mov", "ogv"], maxBytes: 200 * MB },
  document: { mimes: ["application/pdf"], exts: ["pdf"], maxBytes: 20 * MB },
};

export const ACCEPT_ATTR = Object.values(MEDIA_RULES).flatMap((r) => r.mimes).join(",");

export type MediaFolder = "images" | "videos" | "documents" | "logos" | "icons";
export type MediaScope = { scope: "shared" | "page" | "template"; pageId?: string | null; folder?: MediaFolder };

export function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Normaliza el nombre de archivo para Storage (coincide con la regex de storage.rules). */
export function safeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = name
    .slice(0, name.length - ext.length - 1)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base || "archivo"}.${ext}`;
}

export function validateMediaFile(file: { name: string; type: string; size: number }): { kind: MediaKind } {
  const ext = extensionOf(file.name);
  const entry = (Object.entries(MEDIA_RULES) as [MediaKind, (typeof MEDIA_RULES)[MediaKind]][]).find(([, r]) =>
    r.mimes.includes(file.type),
  );
  if (!entry) throw new Error(`Tipo de archivo no permitido (${file.type || "desconocido"}). SVG y ejecutables están bloqueados.`);
  const [kind, rule] = entry;
  if (!rule.exts.includes(ext)) throw new Error(`La extensión .${ext} no corresponde a ${file.type}.`);
  if (file.size > rule.maxBytes) throw new Error(`El archivo supera el máximo de ${rule.maxBytes / MB} MB para ${kind}.`);
  if (file.size === 0) throw new Error("El archivo está vacío.");
  return { kind };
}

export function storageBase(target: MediaScope, kind: MediaKind) {
  const folder = target.folder ?? (kind === "image" ? "images" : kind === "video" ? "videos" : "documents");
  if (target.scope === "page") {
    if (!target.pageId) throw new Error("pageId requerido");
    return { folder, base: `landing-pages/${target.pageId}/${folder}` };
  }
  if (target.scope === "template") return { folder, base: `templates/${folder}` };
  return { folder, base: `shared/${folder}` };
}

// ---------- Inspección en el navegador ----------
type Probe = { width: number | null; height: number | null; duration: number | null; thumb: Blob | null };

const THUMB_WIDTH = 480;

function canvasToWebp(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const scale = Math.min(1, THUMB_WIDTH / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/webp", 0.8));
}

/** Lee dimensiones y genera una miniatura WebP (las grillas no descargan el original). */
export async function probeMedia(file: Blob, kind: MediaKind): Promise<Probe> {
  if (typeof document === "undefined") return { width: null, height: null, duration: null, thumb: null };
  try {
    if (kind === "image") {
      const bmp = await createImageBitmap(file);
      const thumb = await canvasToWebp(bmp, bmp.width, bmp.height);
      return { width: bmp.width, height: bmp.height, duration: null, thumb };
    }
    if (kind === "video") {
      const url = URL.createObjectURL(file);
      try {
        const video = document.createElement("video");
        video.muted = true;
        video.preload = "auto";
        video.src = url;
        await new Promise<void>((res, rej) => {
          video.onloadeddata = () => res();
          video.onerror = () => rej(new Error("No se pudo leer el video"));
        });
        const duration = Number.isFinite(video.duration) ? video.duration : null;
        video.currentTime = Math.min(1, (duration ?? 1) / 3);
        await new Promise<void>((res) => {
          video.onseeked = () => res();
          setTimeout(res, 1500);
        });
        const thumb = await canvasToWebp(video, video.videoWidth || 640, video.videoHeight || 360);
        return { width: video.videoWidth || null, height: video.videoHeight || null, duration, thumb };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch {
    /* metadatos opcionales */
  }
  return { width: null, height: null, duration: null, thumb: null };
}

// ---------- Subida ----------
export type UploadProgress = { bytesTransferred: number; totalBytes: number; percent: number };

export type UploadHandle = { promise: Promise<MediaDoc>; cancel: () => void };

export function uploadMedia(
  db: Firestore,
  storage: FirebaseStorage,
  actor: Actor,
  file: File,
  target: MediaScope,
  opts: { onProgress?: (p: UploadProgress) => void; id?: string; alt?: string; displayName?: string; tags?: string[] } = {},
): UploadHandle {
  let cancelled = false;
  let cancelTask: () => void = () => {
    cancelled = true;
  };
  const promise = (async () => {
    const { kind } = validateMediaFile(file);
    const id = opts.id ?? doc(collection(db, "media")).id;
    const { base, folder } = storageBase(target, kind);
    const name = safeFileName(file.name);
    const path = `${base}/${id}/${name}`;
    const probe = await probeMedia(file, kind);
    if (cancelled) throw new Error("Subida cancelada");

    const task = uploadBytesResumable(storageRef(storage, path), file, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      customMetadata: { mediaId: id, uploadedBy: actor.uid },
    });
    cancelTask = () => task.cancel();
    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (s) =>
          opts.onProgress?.({
            bytesTransferred: s.bytesTransferred,
            totalBytes: s.totalBytes,
            percent: s.totalBytes ? Math.round((s.bytesTransferred / s.totalBytes) * 100) : 0,
          }),
        (err) => reject(err.code === "storage/canceled" ? new Error("Subida cancelada") : err),
        () => resolve(),
      );
    });
    const url = await getDownloadURL(task.snapshot.ref);
    let thumbPath: string | null = null;
    let thumbUrl: string | null = null;
    if (probe.thumb) {
      thumbPath = `${base}/${id}/thumb.webp`;
      const t = await uploadBytes(storageRef(storage, thumbPath), probe.thumb, {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000",
      });
      thumbUrl = await getDownloadURL(t.ref);
    }
    const displayName = opts.displayName ?? file.name.replace(/\.[^.]+$/, "");
    const media: Omit<MediaDoc, "id" | "createdAt" | "updatedAt"> = {
      name,
      displayName,
      searchName: displayName.toLowerCase(),
      mime: file.type,
      size: file.size,
      kind,
      folder,
      scope: target.scope,
      pageId: target.pageId ?? null,
      path,
      url,
      thumbPath,
      thumbUrl,
      width: probe.width,
      height: probe.height,
      duration: probe.duration,
      alt: opts.alt ?? "",
      tags: opts.tags ?? [],
      supersededPaths: [],
      uploadedBy: actor.uid,
      uploadedByEmail: actor.email ?? undefined,
    };
    await setDoc(doc(db, "media", id), {
      ...media,
      uploadedByEmail: actor.email ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id, ...media, createdAt: new Date(), updatedAt: new Date() } as MediaDoc;
  })();
  return { promise, cancel: () => cancelTask() };
}

/**
 * Reemplaza el archivo conservando el mismo mediaId: los bloques que lo referencian
 * muestran el nuevo archivo. El objeto anterior se conserva en `supersededPaths`
 * porque las páginas ya publicadas siguen apuntando a su URL hasta republicarse.
 */
export function replaceMediaFile(
  db: Firestore,
  storage: FirebaseStorage,
  actor: Actor,
  media: MediaDoc,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): UploadHandle {
  let cancel: () => void = () => {};
  const promise = (async () => {
    const { kind } = validateMediaFile(file);
    if (kind !== media.kind) throw new Error(`El reemplazo debe ser del mismo tipo (${media.kind}).`);
    const base = media.path.slice(0, media.path.lastIndexOf("/"));
    let name = safeFileName(file.name);
    if (`${base}/${name}` === media.path) name = name.replace(/(\.[^.]+)$/, `-${Date.now().toString(36)}$1`);
    const path = `${base}/${name}`;
    const probe = await probeMedia(file, kind);
    const task = uploadBytesResumable(storageRef(storage, path), file, {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    });
    cancel = () => task.cancel();
    await new Promise<void>((resolve, reject) =>
      task.on(
        "state_changed",
        (s) => onProgress?.({ bytesTransferred: s.bytesTransferred, totalBytes: s.totalBytes, percent: Math.round((s.bytesTransferred / s.totalBytes) * 100) }),
        reject,
        () => resolve(),
      ),
    );
    const url = await getDownloadURL(task.snapshot.ref);
    let thumbUrl = media.thumbUrl;
    let thumbPath = media.thumbPath;
    if (probe.thumb) {
      thumbPath = `${base}/thumb.webp`;
      const t = await uploadBytes(storageRef(storage, thumbPath), probe.thumb, { contentType: "image/webp" });
      thumbUrl = await getDownloadURL(t.ref);
    }
    const patch = {
      name,
      mime: file.type,
      size: file.size,
      path,
      url,
      thumbPath,
      thumbUrl,
      width: probe.width,
      height: probe.height,
      duration: probe.duration,
      supersededPaths: [...(media.supersededPaths ?? []), media.path],
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, "media", media.id), patch);
    return { ...media, ...patch, updatedAt: new Date() } as MediaDoc;
  })();
  return { promise, cancel: () => cancel() };
}

// ---------- Consulta ----------
export type MediaPage = { items: MediaDoc[]; cursor: QueryDocumentSnapshot | null };

export async function listMedia(db: Firestore, opts: { pageSize?: number; after?: QueryDocumentSnapshot | null } = {}): Promise<MediaPage> {
  const size = opts.pageSize ?? 60;
  const q = opts.after
    ? query(collection(db, "media"), orderBy("createdAt", "desc"), startAfter(opts.after), limit(size))
    : query(collection(db, "media"), orderBy("createdAt", "desc"), limit(size));
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MediaDoc, "id">) })),
    cursor: snap.docs.length === size ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function getMedia(db: Firestore, id: string): Promise<MediaDoc | null> {
  const s = await getDoc(doc(db, "media", id));
  return s.exists() ? ({ id: s.id, ...(s.data() as Omit<MediaDoc, "id">) } as MediaDoc) : null;
}

export async function updateMediaMeta(db: Firestore, id: string, patch: Partial<Pick<MediaDoc, "displayName" | "alt" | "tags">>) {
  const update: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) update.searchName = patch.displayName.toLowerCase();
  await updateDoc(doc(db, "media", id), update);
}

export function toMediaRef(m: MediaDoc, alt?: string): MediaRef {
  return {
    mediaId: m.id,
    path: m.path,
    url: m.url,
    thumbUrl: m.thumbUrl ?? undefined,
    alt: alt ?? m.alt,
    kind: m.kind,
    mime: m.mime,
    width: m.width ?? undefined,
    height: m.height ?? undefined,
  };
}

// ---------- Referencias y eliminación ----------
export type MediaReferences = {
  pages: { id: string; name: string }[];
  published: string[];
  settings: string[];
  templates: { id: string; name: string }[];
  blocks: { id: string; name: string }[];
  total: number;
};

/** Busca dónde se usa un recurso (borradores, publicadas, ajustes, plantillas y bloques). */
export async function findMediaReferences(db: Firestore, mediaId: string): Promise<MediaReferences> {
  const byRef = (name: string) =>
    getDocsFromServer(query(collection(db, name), where("mediaRefs", "array-contains", mediaId), limit(50)));
  const [pages, published, drafts, settings, templates, blocks] = await Promise.all([
    byRef("pages"),
    byRef("publishedPages"),
    byRef("globalSettingsDrafts"),
    byRef("globalSettings"),
    byRef("templates"),
    byRef("savedBlocks"),
  ]);
  const settingKeys = new Set([...drafts.docs.map((d) => `${d.id} (borrador)`), ...settings.docs.map((d) => `${d.id} (publicado)`)]);
  const result: MediaReferences = {
    pages: pages.docs.map((d) => ({ id: d.id, name: d.data().name })),
    published: published.docs.map((d) => d.id),
    settings: [...settingKeys],
    templates: templates.docs.map((d) => ({ id: d.id, name: d.data().name })),
    blocks: blocks.docs.map((d) => ({ id: d.id, name: d.data().name })),
    total: 0,
  };
  result.total = result.pages.length + result.published.length + result.settings.length + result.templates.length + result.blocks.length;
  return result;
}

async function deleteObjectIfExists(storage: FirebaseStorage, path: string | null) {
  if (!path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch (e) {
    if ((e as { code?: string }).code !== "storage/object-not-found") throw e;
  }
}

/** Elimina archivo(s) en Storage y metadatos en Firestore. Lanza si tiene referencias y no se fuerza. */
export async function deleteMedia(db: Firestore, storage: FirebaseStorage, media: MediaDoc, opts: { force?: boolean } = {}) {
  if (!opts.force) {
    const refs = await findMediaReferences(db, media.id);
    if (refs.total > 0) throw new Error(`El recurso está en uso en ${refs.total} lugar(es).`);
  }
  await deleteObjectIfExists(storage, media.path);
  await deleteObjectIfExists(storage, media.thumbPath);
  for (const p of media.supersededPaths ?? []) await deleteObjectIfExists(storage, p);
  await deleteDoc(doc(db, "media", media.id));
}

/** Limpieza controlada: elimina archivos reemplazados que ya no usa ninguna página publicada. */
export async function cleanupSuperseded(db: Firestore, storage: FirebaseStorage, media: MediaDoc) {
  const refs = await findMediaReferences(db, media.id);
  if (refs.published.length) {
    throw new Error("Hay páginas publicadas que aún pueden usar el archivo anterior. Vuelve a publicarlas primero.");
  }
  for (const p of media.supersededPaths ?? []) await deleteObjectIfExists(storage, p);
  await updateDoc(doc(db, "media", media.id), { supersededPaths: [], updatedAt: serverTimestamp() });
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
}
