import type { Data } from "@puckeditor/core";

/** Versión del esquema de los documentos de página. Incrementar ante cambios incompatibles. */
export const PAGE_SCHEMA_VERSION = 1;

export type Role = "admin" | "editor" | "viewer";
export const ROLES: Role[] = ["admin", "editor", "viewer"];

export type Device = "desktop" | "tablet" | "mobile";
export const DEVICES: Device[] = ["desktop", "tablet", "mobile"];

/** Breakpoints (desktop-first): tablet <= 1024px, mobile <= 640px. */
export const BREAKPOINTS = { tablet: 1024, mobile: 640 } as const;

/** Datos del editor (formato Puck). Es el contrato serializado en Firestore. */
export type PageData = Data;

export type Timestamp = { seconds: number; nanoseconds: number } | Date | null;

/**
 * Referencia a un recurso multimedia. `mediaId` + `path` permiten resolverlo de nuevo
 * desde Firestore/Storage; `url` es una caché que se refresca al cargar y al publicar.
 */
export type MediaRef = {
  mediaId?: string;
  path?: string;
  url: string;
  thumbUrl?: string;
  alt?: string;
  kind?: MediaKind | "external";
  mime?: string;
  width?: number;
  height?: number;
};

export type MediaKind = "image" | "video" | "document";

export type SeoSettings = {
  title: string;
  description: string;
  ogImage: MediaRef | null;
  noindex: boolean;
  canonicalUrl?: string;
};

export type PageStatus = "draft" | "published" | "unpublished";

export type PageDoc = {
  id: string;
  schemaVersion: number;
  name: string;
  slug: string;
  status: PageStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  seo: SeoSettings;
  coverImage: MediaRef | null;
  templateId: string | null;
  draftRevision: number;
  hasUnpublishedChanges: boolean;
  publishedVersionId: string | null;
  publishedSlug: string | null;
  publishedAt: Timestamp;
  versionCount: number;
  mediaRefs: string[];
};

export type DraftMeta = {
  revision: number;
  chunkCount: number;
  inline: string | null;
  byteSize: number;
  updatedAt: Timestamp;
  updatedBy: string;
  updatedByEmail?: string;
};

export type VersionKind = "publish" | "manual" | "backup";

export type VersionDoc = {
  id: string;
  number: number;
  kind: VersionKind;
  note: string;
  slug: string;
  seo: SeoSettings;
  chunkCount: number;
  byteSize: number;
  createdAt: Timestamp;
  createdBy: string;
  createdByEmail?: string;
  draftRevision: number;
};

export type PublishedPageDoc = {
  slug: string;
  pageId: string;
  versionId: string;
  name: string;
  seo: SeoSettings;
  chunkCount: number;
  inline: string | null;
  byteSize: number;
  mediaRefs: string[];
  publishedAt: Timestamp;
  publishedBy: string;
  schemaVersion: number;
};

export type MediaDoc = {
  id: string;
  name: string;
  displayName: string;
  searchName: string;
  mime: string;
  size: number;
  kind: MediaKind;
  folder: string;
  scope: "shared" | "page" | "template";
  pageId: string | null;
  path: string;
  url: string;
  thumbPath: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  alt: string;
  tags: string[];
  supersededPaths: string[];
  uploadedBy: string;
  uploadedByEmail?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TemplateDoc = {
  id: string;
  name: string;
  category: string;
  description: string;
  json: string;
  thumbnail: MediaRef | null;
  builtIn: boolean;
  mediaRefs: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type SavedBlockDoc = {
  id: string;
  name: string;
  /** JSON de un ComponentData de Puck. */
  json: string;
  /** Si es true puede insertarse como bloque vinculado (BloqueCompartido). */
  shared: boolean;
  mediaRefs: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserDoc = {
  uid: string;
  email: string;
  displayName: string;
  role: Role | null;
  updatedAt: Timestamp;
};
