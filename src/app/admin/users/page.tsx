"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { roleLabel, useAuth } from "@/components/admin/auth";
import { errorMessage, FormRow, NativeSelect } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/firebase/client";
import type { Role } from "@/lib/model/types";

type Row = { uid: string; email: string; displayName: string; role: Role | null; disabled: boolean; lastSignIn: string | null };

export default function UsersPage() {
  const { can, getIdToken, refreshClaims, user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editorsCanPublish, setEditorsCanPublish] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);

  const api = useCallback(
    async (method: "GET" | "POST", body?: unknown) => {
      const token = await getIdToken();
      const res = await fetch("/api/admin/users", {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      return json;
    },
    [getIdToken],
  );

  const refresh = useCallback(async () => {
    try {
      const [list, perms] = await Promise.all([api("GET"), getDoc(doc(db, "config", "permissions"))]);
      setRows(list.users);
      setEditorsCanPublish(perms.exists() && perms.data().editorsCanPublish === true);
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, [api]);

  useEffect(() => {
    if (can.admin) void refresh();
  }, [can.admin, refresh]);

  if (!can.admin) return <p className="p-8 text-sm text-muted-foreground">Solo los administradores pueden gestionar usuarios.</p>;

  async function assign(targetEmail: string, newRole: Role | null, pwd?: string) {
    setBusy(true);
    try {
      await api("POST", { email: targetEmail, role: newRole, password: pwd || undefined });
      toast.success(`Rol actualizado: ${targetEmail} → ${roleLabel(newRole)}`, { description: "El usuario debe volver a iniciar sesión o recargar para aplicar el cambio." });
      if (targetEmail === user?.email) await refreshClaims();
      await refresh();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Usuarios y permisos" description="Los roles se guardan como custom claims de Firebase Authentication mediante el Admin SDK en el servidor." />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Asignar rol / crear usuario</CardTitle>
              <CardDescription>Si el correo no existe se crea con la contraseña inicial indicada.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FormRow label="Correo">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormRow>
              <FormRow label="Rol">
                <NativeSelect value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="admin">Administrador (control total)</option>
                  <option value="editor">Editor (crea y edita)</option>
                  <option value="viewer">Lector (solo lectura y vista previa)</option>
                </NativeSelect>
              </FormRow>
              <FormRow label="Contraseña inicial (solo usuarios nuevos)">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </FormRow>
              <div className="flex items-end">
                <Button
                  disabled={!email || busy}
                  onClick={async () => {
                    if (await assign(email.trim(), role, password)) {
                      setEmail("");
                      setPassword("");
                    }
                  }}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Permisos de publicación</CardTitle>
              <CardDescription>Controla si los editores pueden publicar y despublicar páginas y ajustes globales.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
                Los editores pueden publicar
                <Switch
                  checked={editorsCanPublish}
                  onCheckedChange={async (v) => {
                    try {
                      await setDoc(doc(db, "config", "permissions"), { editorsCanPublish: !!v, updatedAt: serverTimestamp(), updatedBy: user!.uid });
                      setEditorsCanPublish(!!v);
                      toast.success("Permiso actualizado");
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                />
              </label>
            </CardContent>
          </Card>
        </div>
        {rows === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Último acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.uid}>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <NativeSelect className="w-48" value={r.role ?? ""} disabled={busy || r.uid === user?.uid} onChange={(e) => assign(r.email, (e.target.value || null) as Role | null)}>
                        <option value="">Sin acceso</option>
                        <option value="admin">Administrador</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Lector</option>
                      </NativeSelect>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.lastSignIn ? new Date(r.lastSignIn).toLocaleString("es") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
