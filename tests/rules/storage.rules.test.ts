import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { createEnv, stOf } from "./helpers";

let env: RulesTestEnvironment;
const bytes = (n = 16) => new Uint8Array(n);
const MB = 1024 * 1024;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (c) => {
    await c.storage().ref("shared/images/m1/foto.png").put(bytes(), { contentType: "image/png" });
    await c.storage().ref("private/interno.pdf").put(bytes(), { contentType: "application/pdf" });
  });
});

describe("Storage", () => {
  it("los recursos públicos se leen sin sesión; los privados no", async () => {
    await assertSucceeds(getBytes(ref(stOf(env, "anon"), "shared/images/m1/foto.png")));
    await assertFails(getBytes(ref(stOf(env, "anon"), "private/interno.pdf")));
    await assertSucceeds(getBytes(ref(stOf(env, "viewer"), "private/interno.pdf")));
  });

  it("solo admin/editor suben archivos", async () => {
    const path = "shared/images/m2/a.png";
    await assertFails(uploadBytes(ref(stOf(env, "anon"), path), bytes(), { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(stOf(env, "noRole"), path), bytes(), { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(stOf(env, "viewer"), path), bytes(), { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(stOf(env, "editor"), path), bytes(), { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(stOf(env, "admin"), "landing-pages/p1/videos/m3/clip.mp4"), bytes(), { contentType: "video/mp4" }));
  });

  it("valida tipo, extensión, carpeta y tamaño", async () => {
    const st = stOf(env, "editor");
    await assertFails(uploadBytes(ref(st, "shared/images/m4/x.svg"), bytes(), { contentType: "image/svg+xml" }));
    await assertFails(uploadBytes(ref(st, "shared/images/m4/x.exe"), bytes(), { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(st, "shared/images/m4/x.mp4"), bytes(), { contentType: "video/mp4" }));
    await assertFails(uploadBytes(ref(st, "shared/documents/m4/x.pdf"), bytes(), { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(st, "shared/images/m4/grande.png"), bytes(10 * MB + 1), { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(st, "otra-carpeta/m4/a.png"), bytes(), { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(st, "shared/videos/m4/thumb.webp"), bytes(), { contentType: "image/webp" }));
    await assertSucceeds(uploadBytes(ref(st, "shared/documents/m4/programa.pdf"), bytes(), { contentType: "application/pdf" }));
  });

  it("solo admin/editor eliminan", async () => {
    await assertFails(deleteObject(ref(stOf(env, "viewer"), "shared/images/m1/foto.png")));
    await assertSucceeds(deleteObject(ref(stOf(env, "editor"), "shared/images/m1/foto.png")));
  });
});
