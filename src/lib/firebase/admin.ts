import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { EMULATOR_PROJECT_ID, USE_EMULATORS, firebaseConfig } from "./config";

/**
 * Firebase Admin SDK. Solo se ejecuta en el servidor (route handlers de Next.js).
 * Credenciales: FIREBASE_SERVICE_ACCOUNT_JSON o Application Default Credentials.
 * Nunca se importan en código de cliente (lo garantiza "server-only").
 */
function createAdminApp(): App {
  if (getApps().length) return getApps()[0]!;
  if (USE_EMULATORS) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    return initializeApp({ projectId: EMULATOR_PROJECT_ID });
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp({
    projectId: firebaseConfig.projectId,
    ...(json ? { credential: cert(JSON.parse(json)) } : {}),
  });
}

export const adminApp = createAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
