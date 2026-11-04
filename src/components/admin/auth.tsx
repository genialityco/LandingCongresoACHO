"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, initAnalytics } from "@/lib/firebase/client";
import { ROLES, type Role } from "@/lib/model/types";
import type { Actor } from "@/lib/services/pages";

type AuthState = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  /** config/permissions.editorsCanPublish (configurable por un admin). */
  editorsCanPublish: boolean;
  actor: Actor | null;
  can: { edit: boolean; publish: boolean; admin: boolean; view: boolean };
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Fuerza la renovación del token (tras un cambio de rol). */
  refreshClaims: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorsCanPublish, setEditorsCanPublish] = useState(false);

  useEffect(() => {
    void initAnalytics();
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setLoading(false);
        return;
      }
      // El rol proviene de los custom claims firmados por Firebase, no del cliente.
      const token = await u.getIdTokenResult();
      const r = token.claims.role as Role | undefined;
      const validRole = r && ROLES.includes(r) ? r : null;
      setRole(validRole);
      if (validRole) {
        try {
          const p = await getDoc(doc(db, "config", "permissions"));
          setEditorsCanPublish(p.exists() && p.data().editorsCanPublish === true);
        } catch {
          setEditorsCanPublish(false);
        }
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);
  const logout = useCallback(() => signOut(auth), []);
  const refreshClaims = useCallback(async () => {
    await auth.currentUser?.getIdToken(true);
  }, []);
  const getIdToken = useCallback(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null), []);

  const value = useMemo<AuthState>(() => {
    const admin = role === "admin";
    const edit = admin || role === "editor";
    return {
      user,
      role,
      loading,
      editorsCanPublish,
      actor: user ? { uid: user.uid, email: user.email } : null,
      can: { admin, edit, publish: admin || (role === "editor" && editorsCanPublish), view: !!role },
      login,
      logout,
      refreshClaims,
      getIdToken,
    };
  }, [user, role, loading, editorsCanPublish, login, logout, refreshClaims, getIdToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

/** Devuelve el actor autenticado (lanza si no hay sesión). */
export function useActor(): Actor {
  const { actor } = useAuth();
  if (!actor) throw new Error("Sesión requerida");
  return actor;
}

export function roleLabel(role: Role | null) {
  return role === "admin" ? "Administrador" : role === "editor" ? "Editor" : role === "viewer" ? "Lector" : "Sin rol";
}
