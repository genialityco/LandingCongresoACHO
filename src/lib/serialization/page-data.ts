import { z } from "zod";
import { getBlockMeta, slotsOf } from "@/builder/schema";
import type { MediaRef, PageData } from "@/lib/model/types";

export type ComponentNode = { type: string; props: Record<string, unknown> & { id: string } };

const componentShape = z.object({
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

const pageDataShape = z.object({
  root: z.object({ props: z.record(z.string(), z.unknown()).optional() }).passthrough(),
  content: z.array(componentShape),
  zones: z.record(z.string(), z.array(componentShape)).optional(),
});

export const EMPTY_PAGE_DATA: PageData = { root: { props: {} }, content: [] };

/** Parsea JSON almacenado en Firestore y valida la forma básica. */
export function parsePageData(json: string): PageData {
  const raw = JSON.parse(json);
  const parsed = pageDataShape.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Datos de página inválidos: ${parsed.error.issues[0]?.message ?? "formato"}`);
  }
  return raw as PageData;
}

/** Recorre todos los componentes (contenido raíz, zonas heredadas y slots anidados). */
export function walkComponents(
  data: PageData,
  visit: (node: ComponentNode, parent: ComponentNode | null, slot: string) => void,
) {
  const walkList = (list: unknown, parent: ComponentNode | null, slot: string) => {
    if (!Array.isArray(list)) return;
    for (const item of list as ComponentNode[]) {
      if (!item || typeof item !== "object") continue;
      visit(item, parent, slot);
      for (const s of slotsOf(item.type)) walkList(item.props?.[s], item, s);
    }
  };
  walkList(data.content, null, "root");
  for (const [zone, list] of Object.entries(data.zones ?? {})) walkList(list, null, zone);
  // Slots definidos en las props de root (no se usan hoy, pero se respetan).
}

export type ValidationIssue = { componentId?: string; type?: string; message: string };

/** Validación estructural antes de publicar. */
export function validatePageData(data: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed = pageDataShape.safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({ message: `${i.path.join(".")}: ${i.message}` }));
  }
  const seen = new Set<string>();
  walkComponents(data as PageData, (node) => {
    const meta = getBlockMeta(node.type);
    if (!meta) issues.push({ componentId: node.props?.id, type: node.type, message: `Tipo de bloque desconocido "${node.type}"` });
    const id = node.props?.id;
    if (typeof id !== "string" || !id) {
      issues.push({ type: node.type, message: "Componente sin id" });
    } else if (seen.has(id)) {
      issues.push({ componentId: id, type: node.type, message: `Id duplicado "${id}"` });
    } else seen.add(id);
    for (const s of meta?.slots ?? []) {
      const v = node.props?.[s];
      if (v !== undefined && !Array.isArray(v)) {
        issues.push({ componentId: id, type: node.type, message: `El slot "${s}" debe ser una lista` });
      }
    }
    if (node.type === "SharedBlock" && !node.props?.blockId) {
      issues.push({ componentId: id, type: node.type, message: "Bloque compartido sin bloque seleccionado" });
    }
  });
  return issues;
}

function isMediaRefLike(v: unknown): v is MediaRef & { mediaId: string } {
  return !!v && typeof v === "object" && typeof (v as MediaRef).mediaId === "string" && !!(v as MediaRef).mediaId;
}

/** Ids de multimedia referenciados en cualquier parte de un valor (página, ajustes, bloque). */
export function collectMediaIds(value: unknown): string[] {
  const ids = new Set<string>();
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== "object") return;
    if (isMediaRefLike(v)) ids.add(v.mediaId);
    for (const child of Object.values(v)) visit(child);
  };
  visit(value);
  return [...ids].sort();
}

/** Copia profunda que transforma cada referencia multimedia. */
export function mapMediaRefs<T>(value: T, fn: (ref: MediaRef & { mediaId: string }) => MediaRef): T {
  const visit = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(visit);
    if (!v || typeof v !== "object") return v;
    const base = isMediaRefLike(v) ? fn(v) : v;
    const out: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(base)) out[k] = visit(child);
    return out;
  };
  return visit(value) as T;
}

export function newBlockId(type: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${type}-${rand}`;
}

/** Clona un componente asignando ids nuevos a él y a sus hijos (inserción como copia). */
export function cloneWithNewIds<T extends ComponentNode>(node: T): T {
  const props: Record<string, unknown> = { ...structuredClone(node.props), id: newBlockId(node.type) };
  for (const s of slotsOf(node.type)) {
    const list = props[s];
    if (Array.isArray(list)) props[s] = list.map((c) => cloneWithNewIds(c as ComponentNode));
  }
  return { ...node, props: props as T["props"] };
}

/** Clona una página entera regenerando todos los ids (plantillas, duplicados). */
export function clonePageWithNewIds(data: PageData): PageData {
  return {
    root: structuredClone(data.root),
    content: (data.content as ComponentNode[]).map(cloneWithNewIds),
    zones: data.zones ? structuredClone(data.zones) : undefined,
  } as PageData;
}

/**
 * Inserta un componente en una zona de Puck. Las zonas de slot tienen la forma
 * "<parentId>:<slot>"; la zona raíz es "root:default-zone".
 */
export function insertIntoZone(data: PageData, zone: string | undefined, index: number, node: ComponentNode): PageData {
  const next = structuredClone(data) as PageData;
  const [parentId, slot] = (zone ?? "root:default-zone").split(":");
  if (!zone || parentId === "root") {
    (next.content as ComponentNode[]).splice(index, 0, node);
    return next;
  }
  let inserted = false;
  walkComponents(next, (n) => {
    if (inserted || n.props.id !== parentId) return;
    const list = Array.isArray(n.props[slot]) ? (n.props[slot] as ComponentNode[]) : [];
    list.splice(index, 0, node);
    n.props[slot] = list;
    inserted = true;
  });
  if (!inserted) (next.content as ComponentNode[]).push(node);
  return next;
}

export function findComponent(data: PageData, id: string): ComponentNode | null {
  let found: ComponentNode | null = null;
  walkComponents(data, (n) => {
    if (!found && n.props.id === id) found = n;
  });
  return found;
}
