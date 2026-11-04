"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { EMULATOR_HOSTS, USE_EMULATORS, firebaseConfig } from "./config";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const storage = getStorage(app);

function createDb(): Firestore {
  // Caché persistente (IndexedDB) para reducir lecturas repetidas en el panel.
  // Firestore sigue siendo la fuente de verdad.
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache:
      typeof window !== "undefined"
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : undefined,
  });
  return db;
}

const globalForDb = globalThis as unknown as { __lpDb?: Firestore; __lpEmu?: boolean };
export const db: Firestore = globalForDb.__lpDb ?? (globalForDb.__lpDb = createDb());

if (USE_EMULATORS && !globalForDb.__lpEmu) {
  globalForDb.__lpEmu = true;
  connectAuthEmulator(auth, EMULATOR_HOSTS.auth, { disableWarnings: true });
  connectFirestoreEmulator(db, EMULATOR_HOSTS.firestore.host, EMULATOR_HOSTS.firestore.port);
  connectStorageEmulator(storage, EMULATOR_HOSTS.storage.host, EMULATOR_HOSTS.storage.port);
}

/** Analytics solo en producción y solo si el navegador lo soporta. */
export async function initAnalytics() {
  if (USE_EMULATORS || !firebaseConfig.measurementId) return;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) getAnalytics(app);
}
