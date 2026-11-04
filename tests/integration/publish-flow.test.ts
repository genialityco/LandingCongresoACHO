import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { PageData } from "@/lib/model/types";
import {
  createPage,
  deletePage,
  DraftConflictError,
  getPage,
  listVersions,
  loadDraft,
  loadPublishedWithClient,
  publishPage,
  PublishValidationError,
  restoreVersion,
  saveDraft,
  unpublishPage,
  updatePageMeta,
} from "@/lib/services/pages";
import { loadSettings, publishSettings, saveSettingsDraft } from "@/lib/services/settings";
import { EMPTY_SETTINGS } from "@/lib/model/settings";
import { createEnv, fsOf, UID } from "../rules/helpers";

/**
 * Flujos críticos ejecutados con los servicios reales del panel contra los emuladores
 * y con las reglas de seguridad activas (cada operación usa el rol correspondiente).
 */
let env: RulesTestEnvironment;
const admin = { uid: UID.admin, email: "admin@test.local" };
const editor = { uid: UID.editor, email: "editor@test.local" };

const pageWith = (title: string, extra: object[] = []): PageData =>
  ({
    root: { props: { title } },
    content: [
      {
        type: "HeroImage",
        props: {
          id: "HeroImage-1",
          background: { type: "image", image: { mediaId: "img1", url: "https://old.example/img1.jpg" }, overlay: { enabled: true, color: "#000", opacity: 0.5 } },
          content: [
            { type: "Heading", props: { id: "Heading-1", text: title, level: "h1" } },
            { type: "Button", props: { id: "Button-1", label: "CTA", href: "#", layout: { desktop: { width: "220px" }, mobile: { width: "100%" } } } },
          ],
        },
      },
      ...extra,
    ],
  }) as unknown as PageData;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    await c.firestore().doc("media/img1").set({ uploadedBy: UID.admin, path: "shared/images/img1/a.jpg", url: "https://new.example/img1.jpg", thumbUrl: "https://new.example/thumb.webp", mime: "image/jpeg", size: 10, kind: "image", width: 800, height: 600 });
    await c.firestore().doc("config/permissions").set({ editorsCanPublish: false });
  });
});

describe("borrador → publicación → versiones", () => {
  it("crea, guarda, detecta conflictos, publica y mantiene el borrador separado de la versión pública", async () => {
    const db = fsOf(env, "admin");
    const anon = fsOf(env, "anon");

    // 2-3. Crear una landing: queda registrada en Firestore como borrador.
    const id = await createPage(db, admin, { name: "Landing", slug: "landing", data: pageWith("v1") });
    expect((await getPage(db, id))?.status).toBe("draft");
    expect((await loadDraft(db, id)).revision).toBe(1);

    // 12-13. Guardar cambios: persisten (nueva lectura desde el servidor).
    const rev2 = await saveDraft(db, admin, id, pageWith("v1 editado"), 1);
    expect(rev2).toBe(2);
    expect(JSON.stringify((await loadDraft(db, id)).data)).toContain("v1 editado");

    // Conflicto: otra sesión que partía de la revisión 1 no puede sobrescribir.
    await expect(saveDraft(fsOf(env, "editor"), editor, id, pageWith("pisado"), 1)).rejects.toBeInstanceOf(DraftConflictError);
    expect(JSON.stringify((await loadDraft(db, id)).data)).toContain("v1 editado");

    // 14-15. Publicar: el snapshot público existe y lo lee un visitante sin sesión.
    expect(await loadPublishedWithClient(anon, "landing")).toBeNull();
    const pub1 = await publishPage(db, admin, id, { expectedRevision: 2 });
    expect(pub1.versionNumber).toBe(1);
    const live1 = await loadPublishedWithClient(anon, "landing");
    expect(JSON.stringify(live1?.data)).toContain("v1 editado");
    // La URL multimedia se refresca desde Firestore al publicar (se conserva mediaId + path).
    expect(JSON.stringify(live1?.data)).toContain("https://new.example/img1.jpg");
    expect(JSON.stringify(live1?.data)).toContain('"path":"shared/images/img1/a.jpg"');
    expect((await getPage(db, id))?.status).toBe("published");

    // 16. Modificar el borrador NO cambia la versión pública.
    await saveDraft(db, admin, id, pageWith("borrador privado"), 2);
    expect(JSON.stringify((await loadPublishedWithClient(anon, "landing"))?.data)).not.toContain("borrador privado");
    expect((await getPage(db, id))?.hasUnpublishedChanges).toBe(true);
    // Un visitante no puede leer el borrador.
    await expect(getDoc(doc(anon, "pages", id, "draft", "current"))).rejects.toThrow();

    // Segunda publicación
    const pub2 = await publishPage(db, admin, id);
    expect(pub2.versionNumber).toBe(2);
    expect(JSON.stringify((await loadPublishedWithClient(anon, "landing"))?.data)).toContain("borrador privado");

    // 17. Recuperar una versión anterior como borrador (con copia de seguridad automática).
    const versions = await listVersions(db, id);
    expect(versions.map((v) => v.number)).toEqual([2, 1]);
    const v1 = versions.find((v) => v.number === 1)!;
    await restoreVersion(db, admin, id, v1.id);
    expect(JSON.stringify((await loadDraft(db, id)).data)).toContain("v1 editado");
    const after = await listVersions(db, id);
    expect(after[0].kind).toBe("backup");
    // Restaurar no publica: la versión pública sigue siendo la 2.
    expect(JSON.stringify((await loadPublishedWithClient(anon, "landing"))?.data)).toContain("borrador privado");
  });

  it("no publica si falta un recurso multimedia y no toca la versión pública", async () => {
    const db = fsOf(env, "admin");
    const id = await createPage(db, admin, { name: "Rota", slug: "rota", data: pageWith("ok") });
    await publishPage(db, admin, id);
    const broken = pageWith("roto", [{ type: "Image", props: { id: "Image-x", image: { mediaId: "no-existe", url: "https://x/y.jpg" } } }]);
    const draft = await loadDraft(db, id);
    await saveDraft(db, admin, id, broken, draft.revision);
    await expect(publishPage(db, admin, id)).rejects.toBeInstanceOf(PublishValidationError);
    expect(JSON.stringify((await loadPublishedWithClient(fsOf(env, "anon"), "rota"))?.data)).not.toContain("roto");
  });

  it("editor solo publica si el admin lo permite", async () => {
    const id = await createPage(fsOf(env, "editor"), editor, { name: "Editor", slug: "editor-page", data: pageWith("e") });
    await expect(publishPage(fsOf(env, "editor"), editor, id)).rejects.toThrow();
    await setDoc(doc(fsOf(env, "admin"), "config/permissions"), { editorsCanPublish: true });
    await expect(publishPage(fsOf(env, "editor"), editor, id)).resolves.toMatchObject({ slug: "editor-page" });
  });

  it("fragmenta páginas grandes (> 700 KB) y las reconstruye intactas", async () => {
    const db = fsOf(env, "admin");
    const many = Array.from({ length: 2600 }, (_, i) => ({ type: "Paragraph", props: { id: `Paragraph-${i}`, text: "ñ".repeat(200) } }));
    const big = pageWith("grande", many);
    const id = await createPage(db, admin, { name: "Grande", slug: "grande", data: big });
    const draftMeta = (await getDoc(doc(db, "pages", id, "draft", "current"))).data()!;
    expect(draftMeta.chunkCount).toBeGreaterThan(1);
    expect(draftMeta.inline).toBeNull();
    expect((await loadDraft(db, id)).data).toEqual(big);
    await publishPage(db, admin, id);
    const live = await loadPublishedWithClient(fsOf(env, "anon"), "grande");
    expect(live?.data.content.length).toBe(2601);
    // Al reducirse, se eliminan fragmentos sobrantes y vuelve a ser inline.
    await saveDraft(db, admin, id, pageWith("pequeña"), 1);
    expect((await getDoc(doc(db, "pages", id, "draft", "current"))).data()!.inline).not.toBeNull();
    expect((await loadDraft(db, id)).data).toEqual(pageWith("pequeña"));
  });

  it("al cambiar el slug y republicar se libera el anterior; despublicar lo retira", async () => {
    const db = fsOf(env, "admin");
    const anon = fsOf(env, "anon");
    const id = await createPage(db, admin, { name: "Slug", slug: "antes", data: pageWith("s") });
    await publishPage(db, admin, id);
    await updatePageMeta(db, admin, id, { slug: "despues" });
    expect(await loadPublishedWithClient(anon, "antes")).not.toBeNull();
    await publishPage(db, admin, id);
    expect(await loadPublishedWithClient(anon, "antes")).toBeNull();
    expect(await loadPublishedWithClient(anon, "despues")).not.toBeNull();
    await unpublishPage(db, admin, id);
    expect(await loadPublishedWithClient(anon, "despues")).toBeNull();
    expect((await getPage(db, id))?.status).toBe("unpublished");
    await deletePage(db, id);
    expect(await getPage(db, id)).toBeNull();
  });

  it("rechaza slugs duplicados", async () => {
    const db = fsOf(env, "admin");
    await createPage(db, admin, { name: "A", slug: "dup" });
    await expect(createPage(db, admin, { name: "B", slug: "dup" })).rejects.toThrow(/en uso/);
  });
});

describe("ajustes globales", () => {
  it("el borrador de navbar no es público hasta publicarlo", async () => {
    const db = fsOf(env, "admin");
    const navbar = { ...EMPTY_SETTINGS.navbar, enabled: true, logoText: "Marca", logo: { mediaId: "img1", url: "https://old.example/logo.png" } };
    await saveSettingsDraft(db, admin, "navbar", navbar);
    expect((await loadSettings(fsOf(env, "anon"), "published")).exists.navbar).toBe(false);
    await publishSettings(db, admin, "navbar");
    const pub = await loadSettings(fsOf(env, "anon"), "published");
    expect(pub.settings.navbar.logoText).toBe("Marca");
    expect(pub.settings.navbar.logo?.url).toBe("https://new.example/img1.jpg");
  });
});
