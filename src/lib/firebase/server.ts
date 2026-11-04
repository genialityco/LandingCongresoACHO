import "server-only";
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore/lite";
import { EMULATOR_HOSTS, USE_EMULATORS, firebaseConfig } from "./config";

/**
 * Firestore Lite (REST, sin listeners ni caché local) para el renderizado público en el
 * servidor. Solo lee colecciones públicas: publishedPages y globalSettings.
 */
const APP_NAME = "public-server";

function createPublicDb(): Firestore {
  const app = getApps().some((a) => a.name === APP_NAME) ? getApp(APP_NAME) : initializeApp(firebaseConfig, APP_NAME);
  const db = getFirestore(app);
  // La conexión al emulador se marca en la propia instancia: el bundler puede evaluar
  // este módulo más de una vez y cada instancia debe conectarse.
  const marked = db as Firestore & { __lpEmulator?: boolean };
  if (USE_EMULATORS && !marked.__lpEmulator) {
    try {
      connectFirestoreEmulator(db, EMULATOR_HOSTS.firestore.host, EMULATOR_HOSTS.firestore.port);
    } catch {
      /* ya conectada */
    }
    marked.__lpEmulator = true;
  }
  return db;
}

export const publicDb = createPublicDb();
