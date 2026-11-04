/**
 * Asigna un rol (custom claim) a un usuario existente. Pensado para crear el PRIMER
 * administrador en producción; después los roles se gestionan desde /admin/users.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/set-role.ts usuario@dominio.com admin
 *
 * La clave de servicio NUNCA debe subirse al repositorio ni exponerse al navegador.
 */
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [email, role] = process.argv.slice(2);
const ROLES = ["admin", "editor", "viewer"];

async function main() {
  if (!email || !ROLES.includes(role)) {
    console.error("Uso: tsx scripts/set-role.ts <email> <admin|editor|viewer>");
    process.exit(1);
  }
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "congresoacho";
  const emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  initializeApp(emulator ? { projectId: "demo-congresoacho" } : { credential: applicationDefault(), projectId });
  console.log(emulator ? "→ Emulador" : `→ PRODUCCIÓN (${projectId})`);
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });
  await getFirestore().doc(`users/${user.uid}`).set({ uid: user.uid, email, role, updatedAt: new Date() }, { merge: true });
  console.log(`✔ ${email} ahora es ${role}. Debe cerrar sesión y volver a entrar.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
