import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/components/admin/auth";

export const metadata: Metadata = { title: "Vista previa", robots: { index: false, follow: false } };

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  );
}
