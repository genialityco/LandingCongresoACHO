import type { FirebaseOptions } from "firebase/app";

/** true cuando el proyecto debe usar Firebase Emulator Suite. */
export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

/**
 * Con emuladores se usa un proyecto "demo-*": el SDK nunca puede alcanzar recursos
 * reales aunque algo se configure mal.
 */
export const EMULATOR_PROJECT_ID = "demo-congresoacho";

export const firebaseConfig: FirebaseOptions = USE_EMULATORS
  ? {
      apiKey: "demo-api-key",
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: EMULATOR_PROJECT_ID,
      storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
      appId: "demo-app",
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

export const EMULATOR_HOSTS = {
  auth: "http://127.0.0.1:9099",
  firestore: { host: "127.0.0.1", port: 8080 },
  storage: { host: "127.0.0.1", port: 9199 },
};

if (!USE_EMULATORS) {
  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
  ]
    .filter(([, value]) => typeof value !== "string" || !value.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de configuración de Firebase: ${missing.join(", ")}`);
  }
}
