/**
 * Crea usuarios de prueba en el EMULADOR de Authentication con sus roles (custom claims).
 * Nunca se conecta a producción: exige FIREBASE_AUTH_EMULATOR_HOST.
 *
 *   npm run emulators:users
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const USERS = [
  { email: "admin@demo.local", password: "admin123", role: "admin" },
  { email: "editor@demo.local", password: "editor123", role: "editor" },
  { email: "viewer@demo.local", password: "viewer123", role: "viewer" },
] as const;

async function main() {
  initializeApp({ projectId: "demo-congresoacho" });
  const auth = getAuth();
  const db = getFirestore();
  for (const u of USERS) {
    let user;
    try {
      user = await auth.getUserByEmail(u.email);
    } catch {
      user = await auth.createUser({ email: u.email, password: u.password, displayName: u.role });
    }
    await auth.setCustomUserClaims(user.uid, { role: u.role });
    await db.doc(`users/${user.uid}`).set({ uid: user.uid, email: u.email, displayName: u.role, role: u.role, updatedAt: new Date() }, { merge: true });
    console.log(`✔ ${u.email} / ${u.password} → ${u.role}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
