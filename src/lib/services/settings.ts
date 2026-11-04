import { collection, doc, getDocFromServer, getDocsFromServer, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import {
  SETTINGS_KEYS,
  withDefaults,
  type GlobalSettings,
  type SettingsKey,
} from "@/lib/model/settings";
import { collectMediaIds, mapMediaRefs } from "@/lib/serialization/page-data";
import { clean, firestoreMediaLookup, PublishValidationError, type Actor } from "./pages";

export type SettingsSource = "drafts" | "published";
const collectionFor = (source: SettingsSource) => (source === "drafts" ? "globalSettingsDrafts" : "globalSettings");

export type LoadedSettings = { settings: GlobalSettings; exists: Record<SettingsKey, boolean> };

export async function loadSettings(db: Firestore, source: SettingsSource): Promise<LoadedSettings> {
  const snap = await getDocsFromServer(collection(db, collectionFor(source)));
  const values = new Map(snap.docs.map((d) => [d.id, d.data().value]));
  const settings = {} as GlobalSettings;
  const exists = {} as Record<SettingsKey, boolean>;
  for (const key of SETTINGS_KEYS) {
    (settings as Record<SettingsKey, unknown>)[key] = withDefaults(key, values.get(key));
    exists[key] = values.has(key);
  }
  return { settings, exists };
}

export async function saveSettingsDraft<K extends SettingsKey>(
  db: Firestore, actor: Actor, key: K, value: GlobalSettings[K],
) {
  await setDoc(doc(db, "globalSettingsDrafts", key), {
    value: clean(value),
    mediaRefs: collectMediaIds(value),
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });
}

/** Copia el borrador de un ajuste global a la versión pública, refrescando URLs multimedia. */
export async function publishSettings(db: Firestore, actor: Actor, key: SettingsKey) {
  const snap = await getDocFromServer(doc(db, "globalSettingsDrafts", key));
  if (!snap.exists()) throw new Error("No hay borrador para publicar");
  const value = snap.data().value;
  const ids = collectMediaIds(value);
  const media = ids.length ? await firestoreMediaLookup(db)(ids) : new Map();
  const missing = ids.filter((id) => !media.get(id)?.exists);
  if (missing.length) {
    throw new PublishValidationError(missing.map((id) => ({ message: `Recurso multimedia no encontrado: ${id}` })));
  }
  const fresh = mapMediaRefs(value, (ref) => {
    const m = media.get(ref.mediaId)!;
    const { exists: _e, ...rest } = m;
    return { ...ref, ...clean(rest), alt: ref.alt };
  });
  await setDoc(doc(db, "globalSettings", key), {
    value: clean(fresh),
    mediaRefs: ids,
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });
}
