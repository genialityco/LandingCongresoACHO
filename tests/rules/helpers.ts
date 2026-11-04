import { readFileSync } from "node:fs";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

// Proyecto propio para pruebas: nunca toca los datos del emulador de desarrollo.
export const PROJECT_ID = process.env.TEST_PROJECT_ID ?? "demo-congresoacho-test";

function hostPort(envVar: string, fallback: number) {
  const [host, port] = (process.env[envVar] ?? `127.0.0.1:${fallback}`).split(":");
  return { host, port: Number(port) };
}

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8"), ...hostPort("FIRESTORE_EMULATOR_HOST", 8080) },
    storage: { rules: readFileSync("storage.rules", "utf8"), ...hostPort("FIREBASE_STORAGE_EMULATOR_HOST", 9199) },
  });
}

export type Who = "anon" | "noRole" | "viewer" | "editor" | "admin" | "editor2";

export const UID: Record<Exclude<Who, "anon">, string> = {
  noRole: "u-norole",
  viewer: "u-viewer",
  editor: "u-editor",
  editor2: "u-editor2",
  admin: "u-admin",
};

export function ctx(env: RulesTestEnvironment, who: Who) {
  if (who === "anon") return env.unauthenticatedContext();
  const role = who === "editor2" ? "editor" : who === "noRole" ? undefined : who;
  return env.authenticatedContext(UID[who], { email: `${who}@test.local`, ...(role ? { role } : {}) });
}

// El contexto de rules-unit-testing es compatible con el SDK modular.
export const fsOf = (env: RulesTestEnvironment, who: Who) => ctx(env, who).firestore() as unknown as Firestore;
export const stOf = (env: RulesTestEnvironment, who: Who) => ctx(env, who).storage() as unknown as FirebaseStorage;

export function validPage(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    name: "Página",
    slug: "pagina",
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: uid,
    updatedBy: uid,
    seo: { title: "", description: "", ogImage: null, noindex: false },
    publishedVersionId: null,
    ...overrides,
  };
}
