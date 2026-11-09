import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { createEnv, fsOf, UID, validPage } from "./helpers";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc("pages/p1").set(validPage(UID.editor, { slug: "p1" }));
    await db.doc("pages/p1/draft/current").set({ revision: 3, chunkCount: 1, inline: "{}", updatedBy: UID.editor });
    await db.doc("pages/p1/versions/v1").set({ number: 1, kind: "publish", createdBy: UID.admin });
    await db.doc("publishedPages/p1").set({ slug: "p1", pageId: "p1", versionId: "v1", inline: "{}" });
    await db.doc("globalSettings/theme").set({ value: {} });
    await db.doc("globalSettingsDrafts/theme").set({ value: {} });
    await db.doc("media/m1").set({ uploadedBy: UID.editor, path: "shared/images/m1/a.png", mime: "image/png", size: 10, kind: "image" });
    await db.doc("templates/t1").set({ name: "T", json: "{}", createdBy: UID.admin, builtIn: true });
    await db.doc(`users/${UID.editor}`).set({ role: "editor" });
    await db.doc("config/permissions").set({ editorsCanPublish: false });
  });
});

describe("lectura pública", () => {
  it("cualquiera lee páginas publicadas y ajustes globales publicados", async () => {
    const db = fsOf(env, "anon");
    await assertSucceeds(getDoc(doc(db, "publishedPages/p1")));
    await assertSucceeds(getDoc(doc(db, "globalSettings/theme")));
  });
  it("los visitantes no leen borradores, versiones, multimedia ni plantillas", async () => {
    const db = fsOf(env, "anon");
    await assertFails(getDoc(doc(db, "pages/p1")));
    await assertFails(getDoc(doc(db, "pages/p1/draft/current")));
    await assertFails(getDoc(doc(db, "pages/p1/versions/v1")));
    await assertFails(getDoc(doc(db, "media/m1")));
    await assertFails(getDoc(doc(db, "templates/t1")));
    await assertFails(getDoc(doc(db, "globalSettingsDrafts/theme")));
  });
  it("un usuario autenticado sin rol tampoco lee borradores", async () => {
    await assertFails(getDoc(doc(fsOf(env, "noRole"), "pages/p1")));
  });
  it("viewer puede leer borradores y versiones (vista previa autorizada)", async () => {
    const db = fsOf(env, "viewer");
    await assertSucceeds(getDoc(doc(db, "pages/p1")));
    await assertSucceeds(getDoc(doc(db, "pages/p1/draft/current")));
    await assertSucceeds(getDocs(collection(db, "pages/p1/versions")));
  });
});

describe("escrituras no autorizadas", () => {
  it("visitantes y usuarios sin rol no pueden escribir nada del CMS", async () => {
    for (const who of ["anon", "noRole"] as const) {
      const db = fsOf(env, who);
      await assertFails(setDoc(doc(db, "pages/x"), validPage("u-x", { slug: "x" })));
      await assertFails(setDoc(doc(db, "publishedPages/p1"), { slug: "p1", pageId: "p1", versionId: "v9" }));
      await assertFails(setDoc(doc(db, "globalSettings/theme"), { value: { hacked: true } }));
      await assertFails(setDoc(doc(db, "media/m2"), { uploadedBy: "u-x", path: "x", mime: "image/png", size: 1, kind: "image" }));
    }
  });
  it("viewer no puede crear ni editar", async () => {
    const db = fsOf(env, "viewer");
    await assertFails(setDoc(doc(db, "pages/v"), validPage(UID.viewer, { slug: "v" })));
    await assertFails(updateDoc(doc(db, "pages/p1/draft/current"), { revision: 4, updatedBy: UID.viewer }));
  });
  it("nadie escribe roles desde el cliente (ni siquiera admin)", async () => {
    await assertFails(setDoc(doc(fsOf(env, "admin"), `users/${UID.editor}`), { role: "admin" }));
    await assertFails(setDoc(doc(fsOf(env, "editor"), `users/${UID.editor}`), { role: "admin" }));
  });
  it("no existen reglas abiertas en colecciones no declaradas", async () => {
    await assertFails(setDoc(doc(fsOf(env, "admin"), "cualquiera/doc"), { a: 1 }));
    await assertFails(getDoc(doc(fsOf(env, "anon"), "cualquiera/doc")));
  });
});

describe("páginas y borradores", () => {
  it("editor crea una página válida como borrador", async () => {
    await assertSucceeds(setDoc(doc(fsOf(env, "editor"), "pages/nueva"), validPage(UID.editor, { slug: "nueva" })));
  });
  it("rechaza páginas creadas ya publicadas, a nombre de otro o con slug inválido/reservado", async () => {
    const db = fsOf(env, "editor");
    await assertFails(setDoc(doc(db, "pages/a"), validPage(UID.editor, { slug: "a", status: "published" })));
    await assertFails(setDoc(doc(db, "pages/b"), validPage(UID.admin, { slug: "b" })));
    await assertFails(setDoc(doc(db, "pages/c"), validPage(UID.editor, { slug: "Con Espacios" })));
    await assertFails(setDoc(doc(db, "pages/d"), validPage(UID.editor, { slug: "admin" })));
  });
  it("el borrador solo avanza de revisión en 1 (protección contra sobrescrituras)", async () => {
    const db = fsOf(env, "editor");
    await assertSucceeds(updateDoc(doc(db, "pages/p1/draft/current"), { revision: 4, updatedBy: UID.editor }));
    await assertFails(updateDoc(doc(db, "pages/p1/draft/current"), { revision: 4, updatedBy: UID.editor }));
    await assertFails(updateDoc(doc(db, "pages/p1/draft/current"), { revision: 9, updatedBy: UID.editor }));
    await assertFails(updateDoc(doc(db, "pages/p1/draft/current"), { revision: 5, updatedBy: UID.admin }));
  });
  it("editor sin permiso de publicación no cambia el estado de publicación", async () => {
    const db = fsOf(env, "editor");
    await assertSucceeds(updateDoc(doc(db, "pages/p1"), { name: "Nuevo nombre", updatedBy: UID.editor }));
    await assertFails(updateDoc(doc(db, "pages/p1"), { status: "published", updatedBy: UID.editor }));
    await assertFails(updateDoc(doc(db, "pages/p1"), { createdBy: UID.editor2, updatedBy: UID.editor }));
  });
  it("solo admin elimina páginas", async () => {
    await assertFails(deleteDoc(doc(fsOf(env, "editor"), "pages/p1")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "admin"), "pages/p1")));
  });
});

describe("publicación", () => {
  it("editor no publica salvo que un admin lo habilite", async () => {
    const editor = fsOf(env, "editor");
    await assertFails(setDoc(doc(editor, "publishedPages/p1"), { slug: "p1", pageId: "p1", versionId: "v2" }));
    await assertFails(setDoc(doc(editor, "pages/p1/versions/v2"), { number: 2, kind: "publish", createdBy: UID.editor }));
    await assertSucceeds(setDoc(doc(fsOf(env, "admin"), "config/permissions"), { editorsCanPublish: true }));
    await assertSucceeds(setDoc(doc(editor, "publishedPages/p1"), { slug: "p1", pageId: "p1", versionId: "v2" }));
    await assertSucceeds(updateDoc(doc(editor, "pages/p1"), { status: "published", updatedBy: UID.editor }));
  });
  it("una página no puede ocupar el slug publicado de otra", async () => {
    await assertFails(setDoc(doc(fsOf(env, "admin"), "publishedPages/p1"), { slug: "p1", pageId: "otra", versionId: "v1" }));
    await assertFails(setDoc(doc(fsOf(env, "admin"), "publishedPages/zz"), { slug: "otro", pageId: "p1", versionId: "v1" }));
  });
  it("las versiones son inmutables; editor puede crear copias de seguridad", async () => {
    await assertFails(updateDoc(doc(fsOf(env, "admin"), "pages/p1/versions/v1"), { note: "x" }));
    await assertSucceeds(setDoc(doc(fsOf(env, "editor"), "pages/p1/versions/b1"), { number: 2, kind: "backup", createdBy: UID.editor }));
  });
});

describe("ajustes globales y permisos", () => {
  it("editor edita borradores de ajustes pero no publica ni toca 'site'", async () => {
    const db = fsOf(env, "editor");
    await assertSucceeds(setDoc(doc(db, "globalSettingsDrafts/theme"), { value: { a: 1 } }));
    await assertFails(setDoc(doc(db, "globalSettings/theme"), { value: { a: 1 } }));
    await assertFails(setDoc(doc(db, "globalSettingsDrafts/site"), { value: {} }));
    await assertFails(setDoc(doc(db, "globalSettingsDrafts/otro"), { value: {} }));
  });
  it("solo admin modifica permisos", async () => {
    await assertFails(setDoc(doc(fsOf(env, "editor"), "config/permissions"), { editorsCanPublish: true }));
    await assertFails(setDoc(doc(fsOf(env, "admin"), "config/permissions"), { editorsCanPublish: "sí" }));
    await assertSucceeds(setDoc(doc(fsOf(env, "admin"), "globalSettings/site"), { value: {} }));
  });
});

describe("multimedia y plantillas", () => {
  it("editor registra multimedia propia y no borra la de otros; admin sí", async () => {
    await assertSucceeds(setDoc(doc(fsOf(env, "editor2"), "media/m2"), { uploadedBy: UID.editor2, path: "shared/images/m2/a.png", mime: "image/png", size: 1, kind: "image" }));
    await assertFails(setDoc(doc(fsOf(env, "editor2"), "media/m3"), { uploadedBy: UID.editor, path: "x", mime: "image/png", size: 1, kind: "image" }));
    await assertFails(deleteDoc(doc(fsOf(env, "editor2"), "media/m1")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "editor"), "media/m1")));
  });
  it("las plantillas base solo las borra un admin", async () => {
    await assertFails(deleteDoc(doc(fsOf(env, "editor"), "templates/t1")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "admin"), "templates/t1")));
  });
});

describe("formularios públicos", () => {
  it("un visitante envía un formulario con la forma correcta pero no lee envíos", async () => {
    const db = fsOf(env, "anon");
    await assertSucceeds(addDoc(collection(db, "formSubmissions"), { pageSlug: "demo", formId: "f", fields: { nombre: "Ana" }, createdAt: serverTimestamp() }));
    await assertFails(addDoc(collection(db, "formSubmissions"), { pageSlug: "demo", formId: "f", fields: {}, createdAt: serverTimestamp(), admin: true }));
    await assertFails(addDoc(collection(db, "formSubmissions"), { pageSlug: "demo", formId: "f", fields: {}, createdAt: new Date(0) }));
    await assertFails(getDocs(collection(db, "formSubmissions")));
    await assertSucceeds(getDocs(collection(fsOf(env, "viewer"), "formSubmissions")));
  });
});

describe("suscriptores del newsletter", () => {
  const sub = (email: string, extra: Record<string, unknown> = {}) => ({ email, source: "/demo", createdAt: serverTimestamp(), ...extra });
  it("un visitante se suscribe una sola vez y no puede leer la lista", async () => {
    const db = fsOf(env, "anon");
    await assertSucceeds(setDoc(doc(db, "suscritos/ana@correo.com"), sub("ana@correo.com")));
    await assertFails(setDoc(doc(db, "suscritos/ana@correo.com"), sub("ana@correo.com")));
    await assertFails(getDoc(doc(db, "suscritos/ana@correo.com")));
    await assertFails(getDocs(collection(db, "suscritos")));
    await assertSucceeds(getDocs(collection(fsOf(env, "viewer"), "suscritos")));
  });
  it("rechaza correos inválidos, id distinto al correo o campos extra", async () => {
    const db = fsOf(env, "anon");
    await assertFails(setDoc(doc(db, "suscritos/no-es-correo"), sub("no-es-correo")));
    await assertFails(setDoc(doc(db, "suscritos/a@b.com"), sub("otro@b.com")));
    await assertFails(setDoc(doc(db, "suscritos/c@d.com"), sub("c@d.com", { admin: true })));
    await assertFails(setDoc(doc(db, "suscritos/e@f.com"), { email: "e@f.com", source: "/", createdAt: new Date(0) }));
  });
  it("solo admin elimina suscriptores", async () => {
    await env.withSecurityRulesDisabled((c) => c.firestore().doc("suscritos/x@y.com").set({ email: "x@y.com" }));
    await assertFails(deleteDoc(doc(fsOf(env, "editor"), "suscritos/x@y.com")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "admin"), "suscritos/x@y.com")));
  });
});

describe("inscritos al evento", () => {
  function register(db: Firestore, email: string, telefono: string, extra: Record<string, unknown> = {}, phoneEmail = email) {
    const batch = writeBatch(db);
    batch.set(doc(db, "inscritos", email), { nombre: "Ana Pérez", email, telefono, source: "/inscripciones", createdAt: serverTimestamp(), ...extra });
    batch.set(doc(db, "inscritosTelefonos", telefono), { email: phoneEmail, createdAt: serverTimestamp() });
    return batch.commit();
  }
  it("se inscribe una vez; correo o teléfono repetidos se rechazan", async () => {
    const db = fsOf(env, "anon");
    await assertSucceeds(register(db, "ana@correo.com", "3155555555"));
    await assertFails(register(db, "ana@correo.com", "3001112233"));
    await assertFails(register(db, "otra@correo.com", "3155555555"));
    await assertSucceeds(register(db, "otra@correo.com", "3001112233"));
  });
  it("no se puede escribir solo uno de los dos documentos ni cruzarlos", async () => {
    const db = fsOf(env, "anon");
    await assertFails(setDoc(doc(db, "inscritos/a@b.com"), { nombre: "Ana", email: "a@b.com", telefono: "3111111111", source: "/", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, "inscritosTelefonos/3111111111"), { email: "a@b.com", createdAt: serverTimestamp() }));
    await assertFails(register(db, "a@b.com", "3111111111", {}, "otro@b.com"));
  });
  it("valida los campos", async () => {
    const db = fsOf(env, "anon");
    await assertFails(register(db, "no-es-correo", "3111111111"));
    await assertFails(register(db, "a@b.com", "31-11"));
    await assertFails(register(db, "a@b.com", "3111111111", { nombre: "" }));
    await assertFails(register(db, "a@b.com", "3111111111", { admin: true }));
  });
  it("solo el staff lee y solo admin elimina", async () => {
    await register(fsOf(env, "anon"), "x@y.com", "3222222222");
    await assertFails(getDocs(collection(fsOf(env, "anon"), "inscritos")));
    await assertSucceeds(getDocs(collection(fsOf(env, "viewer"), "inscritos")));
    await assertFails(deleteDoc(doc(fsOf(env, "editor"), "inscritos/x@y.com")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "admin"), "inscritos/x@y.com")));
    await assertSucceeds(deleteDoc(doc(fsOf(env, "admin"), "inscritosTelefonos/3222222222")));
  });
});
