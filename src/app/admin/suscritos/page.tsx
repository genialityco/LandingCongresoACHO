"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { Download, Loader2, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminShell";
import { useAuth } from "@/components/admin/auth";
import { errorMessage, formatDate, useConfirm } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUBSCRIBERS_COLLECTION } from "@/builder/site/Newsletter";
import { db } from "@/lib/firebase/client";

type Subscriber = { id: string; email: string; source?: string; createdAt?: unknown };

export default function SubscribersPage() {
  const { can } = useAuth();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Subscriber[] | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, SUBSCRIBERS_COLLECTION), orderBy("createdAt", "desc"), limit(5000)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscriber, "id">) })));
    } catch (e) {
      toast.error(errorMessage(e));
      setRows([]);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const filtered = useMemo(() => (rows ?? []).filter((r) => r.email.includes(search.trim().toLowerCase())), [rows, search]);

  function exportCsv() {
    const toDate = (ts: unknown) => {
      const s = (ts as { seconds?: number })?.seconds;
      return s ? new Date(s * 1000).toISOString() : "";
    };
    const csv = ["email,origen,fecha", ...filtered.map((r) => [r.email, r.source ?? "", toDate(r.createdAt)].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `suscritos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Suscritos"
        description={`Correos registrados desde el newsletter del footer (colección «${SUBSCRIBERS_COLLECTION}» en Firestore).`}
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
            <Input className="pl-8" placeholder="Buscar correo…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {rows ? <span className="text-sm text-muted-foreground">{filtered.length} de {rows.length}</span> : null}
        </div>
        {rows === null ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay suscritos.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Página de origen</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.source || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {can.admin ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Eliminar ${r.email}`}
                          onClick={async () => {
                            if (!(await confirm({ title: `¿Eliminar a ${r.email}?`, description: "Dejará de estar en la lista. Podrá volver a suscribirse.", destructive: true, confirmLabel: "Eliminar" }))) return;
                            try {
                              await deleteDoc(doc(db, SUBSCRIBERS_COLLECTION, r.id));
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
