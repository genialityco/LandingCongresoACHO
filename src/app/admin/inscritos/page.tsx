"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, limit, orderBy, query, writeBatch } from "firebase/firestore";
import { toast } from "sonner";
import { Download, Loader2, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { errorMessage, formatDate, useConfirm } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { REGISTRATION_PHONES_COLLECTION, REGISTRATIONS_COLLECTION } from "@/builder/blocks/client/Registration";
import { db } from "@/lib/firebase/client";

type Registration = { id: string; nombre: string; email: string; telefono: string; source?: string; createdAt?: unknown };

export default function RegistrationsPage() {
  const { can } = useAuth();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, REGISTRATIONS_COLLECTION), orderBy("createdAt", "desc"), limit(5000)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Registration, "id">) })));
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.email.includes(q) || r.telefono.includes(q) || r.nombre.toLowerCase().includes(q));
  }, [rows, search]);

  function exportCsv() {
    const toDate = (ts: unknown) => {
      const s = (ts as { seconds?: number })?.seconds;
      return s ? new Date(s * 1000).toISOString() : "";
    };
    const csv = [
      "nombre,telefono,email,origen,fecha",
      ...filtered.map((r) => [r.nombre, r.telefono, r.email, r.source ?? "", toDate(r.createdAt)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscritos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Inscritos"
        description={`Personas inscritas desde el bloque «Inscripción al evento» (colección «${REGISTRATIONS_COLLECTION}» en Firestore).`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download /> Exportar CSV
          </Button>
        }
      />
      <div className="space-y-4 p-8">
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <Search className="absolute top-2 left-2 size-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar nombre, correo o teléfono…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {rows ? <span className="text-sm text-muted-foreground">{filtered.length} de {rows.length}</span> : null}
        </div>
        {rows === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay inscritos.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{r.telefono}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {can.admin ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Eliminar ${r.email}`}
                          onClick={async () => {
                            if (!(await confirm({ title: `¿Eliminar a ${r.nombre}?`, description: "Se borra la inscripción. El correo y el teléfono podrán volver a inscribirse.", destructive: true, confirmLabel: "Eliminar" }))) return;
                            try {
                              const batch = writeBatch(db);
                              batch.delete(doc(db, REGISTRATIONS_COLLECTION, r.id));
                              batch.delete(doc(db, REGISTRATION_PHONES_COLLECTION, r.telefono));
                              await batch.commit();
                              setRows((prev) => prev?.filter((x) => x.id !== r.id) ?? null);
                            } catch (e) {
                              toast.error(errorMessage(e));
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </TableCell>
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
