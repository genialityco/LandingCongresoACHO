import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./admin";
import type { Role } from "@/lib/model/types";

/** Verifica el ID token (Authorization: Bearer) y devuelve los claims o null. */
export async function verifyRequest(req: Request, allowed: Role[]): Promise<DecodedIdToken | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return allowed.includes(decoded.role as Role) ? decoded : null;
  } catch {
    return null;
  }
}
