/**
 * Copia el contenido del CMS desde Firebase Emulator Suite a un proyecto real.
 *
 *   1) Exportar (con los emuladores encendidos):
 *        npx tsx scripts/migrate-emulator-to-prod.ts export
 *   2) Importar a producción (credencial de servicio local, nunca en el repo):
 *        GOOGLE_APPLICATION_CREDENTIALS=./congresoacho.json \
 *        npx tsx scripts/migrate-emulator-to-prod.ts import <email-admin-produccion>
 *
 * - No copia `users` ni `formSubmissions`.
 * - No sobrescribe documentos que ya existan en destino.
 * - Sube los archivos de Storage con el mismo token de descarga y reescribe las URLs.
 * - Reasigna la autoría (uid del admin del emulador) al admin de producción.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const DIR = ".migration";
const EMU_PROJECT = "demo-congresoacho";
const EMU_BUCKET = `${EMU_PROJECT}.appspot.com`;
const PROD_PROJECT = process.env.FIREBASE_PROJECT_ID ?? "congresoacho";
const PROD_BUCKET = process.env.FIREBASE_STORAGE_BUCKET ?? "congresoacho.firebasestorage.app";
const SKIP = new Set(["users", "formSubmissions"]);

type DocDump = { path: string; data: unknown };
type FileDump = { name: string; file: string; contentType?: string; cacheControl?: string; token?: string };

// Timestamps <-> JSON
function encode(v: unknown): unknown {
  if (v instanceof Timestamp) return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
  return v;
}
function decode(v: unknown, rewrite: (s: string) => string): unknown {
  if (typeof v === "string") return rewrite(v);
  if (Array.isArray(v)) return v.map((x) => decode(x, rewrite));
  if (v && typeof v === "object") {
    if ("__ts" in v && Object.keys(v).length === 1) return Timestamp.fromMillis((v as { __ts: number }).__ts);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, decode(x, rewrite)]));
  }
  return v;
}

async function exportFromEmulator() {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  initializeApp({ projectId: EMU_PROJECT, storageBucket: EMU_BUCKET });
  const db = getFirestore();
  const docs: DocDump[] = [];

  async function walk(refs: DocumentReference[]) {
    for (const ref of refs) {
      const snap = await ref.get();
      if (snap.exists) docs.push({ path: ref.path, data: encode(snap.data()) });
      const subs = await ref.listCollections();
      for (const c of subs) await walk(await c.listDocuments());
    }
  }
  for (const col of await db.listCollections()) {
    if (SKIP.has(col.id)) continue;
    await walk(await col.listDocuments());
  }

  mkdirSync(join(DIR, "files"), { recursive: true });
  const files: FileDump[] = [];
  const [objects] = await getStorage().bucket(EMU_BUCKET).getFiles();
  for (const [i, f] of objects.entries()) {
    const [buf] = await f.download();
    const local = `f${i}`;
    writeFileSync(join(DIR, "files", local), buf);
    const md = f.metadata;
    files.push({
      name: f.name,
      file: local,
      contentType: md.contentType,
      cacheControl: md.cacheControl,
      token: (md.metadata?.firebaseStorageDownloadTokens as string | undefined)?.split(",")[0],
    });
  }

  let adminUid: string | null = null;
  try {
    adminUid = (await getAuth().getUserByEmail("admin@demo.local")).uid;
  } catch {
    /* sin usuario admin en el emulador */
  }
  writeFileSync(join(DIR, "dump.json"), JSON.stringify({ docs, files, adminUid }, null, 0));
  console.log(`✔ Exportados ${docs.length} documentos y ${files.length} archivos a ${DIR}/`);
}

async function importToProd(adminEmail: string) {
  for (const k of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"]) {
    if (process.env[k]) throw new Error(`${k} está definido: abortado para no confundir destino.`);
  }
  if (!adminEmail) throw new Error("Indica el correo del admin de producción.");
  initializeApp({ credential: applicationDefault(), projectId: PROD_PROJECT, storageBucket: PROD_BUCKET });
  const db = getFirestore();
  const bucket = getStorage().bucket(PROD_BUCKET);
  const { docs, files, adminUid } = JSON.parse(readFileSync(join(DIR, "dump.json"), "utf8")) as {
    docs: DocDump[];
    files: FileDump[];
    adminUid: string | null;
  };
  const prodUid = (await getAuth().getUserByEmail(adminEmail)).uid;

  const emuPrefixes = [`http://127.0.0.1:9199/v0/b/${EMU_BUCKET}/o/`, `http://localhost:9199/v0/b/${EMU_BUCKET}/o/`];
  const prodPrefix = `https://firebasestorage.googleapis.com/v0/b/${PROD_BUCKET}/o/`;
  const rewrite = (s: string) => {
    let out = s;
    for (const p of emuPrefixes) out = out.split(p).join(prodPrefix);
    if (adminUid) out = out === adminUid ? prodUid : out.split(`"${adminUid}"`).join(`"${prodUid}"`);
    return out.split("admin@demo.local").join(adminEmail);
  };

  let uploaded = 0;
  for (const f of files) {
    const target = bucket.file(f.name);
    const [exists] = await target.exists();
    if (exists) continue;
    await target.save(readFileSync(join(DIR, "files", f.file)), {
      resumable: false,
      contentType: f.contentType,
      metadata: { cacheControl: f.cacheControl, metadata: f.token ? { firebaseStorageDownloadTokens: f.token } : {} },
    });
    uploaded++;
  }
  console.log(`✔ Storage: ${uploaded} archivos subidos (${files.length - uploaded} ya existían)`);

  let created = 0;
  let skipped = 0;
  for (const d of docs) {
    try {
      await db.doc(d.path).create(decode(d.data, rewrite) as Record<string, unknown>);
      created++;
    } catch (e) {
      if ((e as { code?: number }).code === 6) skipped++;
      else throw e;
    }
  }
  console.log(`✔ Firestore: ${created} documentos creados, ${skipped} ya existían (no se sobrescribieron)`);
}

const [mode, arg] = process.argv.slice(2);
(mode === "export" ? exportFromEmulator() : mode === "import" ? importToProd(arg) : Promise.reject(new Error("Uso: export | import <email>"))).catch((e) => {
  console.error(e);
  process.exit(1);
});
