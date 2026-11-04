import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyRequest } from "@/lib/firebase/verify";
import { ROLES, type Role } from "@/lib/model/types";

/**
 * Gestión de roles (custom claims). Solo un admin autenticado puede usarla. Es la única
 * operación del sistema que necesita privilegios de servidor (Admin SDK).
 */
export async function GET(req: Request) {
  if (!(await verifyRequest(req, ["admin"]))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const list = await adminAuth.listUsers(200);
  return NextResponse.json({
    users: list.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      displayName: u.displayName ?? "",
      role: (u.customClaims?.role as Role | undefined) ?? null,
      disabled: u.disabled,
      lastSignIn: u.metadata.lastSignInTime ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const caller = await verifyRequest(req, ["admin"]);
  if (!caller) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string | null; password?: string; displayName?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role === null || body.role === "" ? null : (body.role as Role);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  if (role !== null && !ROLES.includes(role)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  let user;
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: "El usuario no existe. Indica una contraseña inicial (mín. 8 caracteres) para crearlo." }, { status: 400 });
    }
    user = await adminAuth.createUser({ email, password: body.password, displayName: body.displayName || undefined });
  }
  if (user.uid === caller.uid && role !== "admin") {
    return NextResponse.json({ error: "No puedes quitarte tu propio rol de administrador." }, { status: 400 });
  }
  await adminAuth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });
  await adminDb.doc(`users/${user.uid}`).set(
    { uid: user.uid, email, displayName: user.displayName ?? body.displayName ?? "", role, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.uid },
    { merge: true },
  );
  return NextResponse.json({ uid: user.uid, email, role });
}
