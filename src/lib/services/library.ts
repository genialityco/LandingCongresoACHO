import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDocsFromServer,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import type { PageData, SavedBlockDoc, TemplateDoc } from "@/lib/model/types";
import { byteLength } from "@/lib/serialization/chunks";
import { collectMediaIds, parsePageData, type ComponentNode } from "@/lib/serialization/page-data";
import type { Actor } from "./pages";

const MAX_INLINE_BYTES = 900_000;

function assertSize(json: string) {
  if (byteLength(json) > MAX_INLINE_BYTES) throw new Error("El contenido es demasiado grande para guardarse como plantilla o bloque.");
}

// ---------- Plantillas ----------
export async function listTemplates(db: Firestore): Promise<TemplateDoc[]> {
  const snap = await getDocsFromServer(query(collection(db, "templates"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TemplateDoc, "id">) }));
}

export function templateData(t: TemplateDoc): PageData {
  return parsePageData(t.json);
}

export async function saveTemplate(
  db: Firestore,
  actor: Actor,
  input: { id?: string; name: string; category: string; description: string; data: PageData; builtIn?: boolean },
) {
  const json = JSON.stringify(input.data);
  assertSize(json);
  const payload = {
    name: input.name,
    category: input.category,
    description: input.description,
    json,
    thumbnail: null,
    builtIn: input.builtIn ?? false,
    mediaRefs: collectMediaIds(input.data),
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.id) {
    await setDoc(doc(db, "templates", input.id), payload);
    return input.id;
  }
  return (await addDoc(collection(db, "templates"), payload)).id;
}

export async function deleteTemplate(db: Firestore, id: string) {
  await deleteDoc(doc(db, "templates", id));
}

// ---------- Bloques guardados ----------
export async function listSavedBlocks(db: Firestore): Promise<SavedBlockDoc[]> {
  const snap = await getDocs(query(collection(db, "savedBlocks"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedBlockDoc, "id">) }));
}

export async function saveBlock(
  db: Firestore,
  actor: Actor,
  input: { name: string; node: ComponentNode; shared: boolean },
) {
  const json = JSON.stringify(input.node);
  assertSize(json);
  return (
    await addDoc(collection(db, "savedBlocks"), {
      name: input.name,
      json,
      shared: input.shared,
      mediaRefs: collectMediaIds(input.node),
      createdBy: actor.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  ).id;
}

export async function updateBlock(
  db: Firestore,
  id: string,
  patch: Partial<{ name: string; shared: boolean; node: ComponentNode }>,
) {
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.shared !== undefined) update.shared = patch.shared;
  if (patch.node) {
    const json = JSON.stringify(patch.node);
    assertSize(json);
    update.json = json;
    update.mediaRefs = collectMediaIds(patch.node);
  }
  await updateDoc(doc(db, "savedBlocks", id), update);
}

export async function deleteBlock(db: Firestore, id: string) {
  await deleteDoc(doc(db, "savedBlocks", id));
}
