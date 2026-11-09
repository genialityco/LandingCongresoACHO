"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Blocks, ClipboardList, Mail, FileText, Image as ImageIcon, LayoutTemplate, Loader2, LogOut, Menu as MenuIcon, Palette, PanelLeft, PanelBottom, Settings2, ShieldCheck, Users } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { USE_EMULATORS } from "@/lib/firebase/config";
import { cn } from "@/lib/utils";
import { AuthProvider, roleLabel, useAuth } from "./auth";
import { ConfirmProvider } from "./ui";

const NAV = [
  { href: "/admin", label: "Páginas", icon: FileText, exact: true },
  { href: "/admin/media", label: "Multimedia", icon: ImageIcon },
  { href: "/admin/templates", label: "Plantillas", icon: LayoutTemplate },
  { href: "/admin/blocks", label: "Bloques guardados", icon: Blocks },
  { href: "/admin/inscritos", label: "Inscritos", icon: ClipboardList },
  { href: "/admin/suscritos", label: "Suscritos", icon: Mail },
  { section: "Ajustes globales" },
  { href: "/admin/settings/theme", label: "Tema y estilos", icon: Palette },
  { href: "/admin/settings/navbar", label: "Navbar", icon: MenuIcon },
  { href: "/admin/settings/sidebar", label: "Sidebar", icon: PanelLeft },
  { href: "/admin/settings/footer", label: "Footer", icon: PanelBottom },
  { href: "/admin/settings/site", label: "Sitio", icon: Settings2, admin: true },
  { href: "/admin/users", label: "Usuarios y permisos", icon: Users, admin: true },
] as const;

function Guard({ children }: { children: ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!loading && !user && !isLogin) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;
  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (!role) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Tu cuenta no tiene permisos</h1>
          <p className="text-sm text-muted-foreground">
            Has iniciado sesión como <strong>{user.email}</strong>, pero un administrador debe asignarte un rol
            (admin, editor o viewer).
          </p>
          <Button variant="outline" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function Sidebar() {
  const pathname = usePathname();
  const { user, role, can, logout } = useAuth();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Blocks className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Landing Builder</div>
          <div className="text-xs text-muted-foreground">Congreso ACHO</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 text-sm">
        {NAV.map((item, i) => {
          if ("section" in item) {
            return (
              <div key={i} className="px-2 pt-4 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {item.section}
              </div>
            );
          }
          if ("admin" in item && item.admin && !can.admin) return null;
          const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent",
                active && "bg-sidebar-accent font-medium",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t p-3 text-xs">
        {USE_EMULATORS ? (
          <div className="rounded-md bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            Modo emulador (datos locales)
          </div>
        ) : null}
        <div className="truncate font-medium">{user?.email}</div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{roleLabel(role)}</span>
          <Button size="xs" variant="ghost" onClick={() => logout()}>
            <LogOut /> Salir
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // El editor y la pantalla de login ocupan toda la ventana.
  const bare = pathname === "/admin/login" || /^\/admin\/pages\/[^/]+$/.test(pathname);
  if (bare) return <>{children}</>;
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Guard>
          <Frame>{children}</Frame>
        </Guard>
      </ConfirmProvider>
      <Toaster richColors position="bottom-right" />
    </AuthProvider>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
