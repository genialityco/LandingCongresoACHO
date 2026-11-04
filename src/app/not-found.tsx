import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <Link className="text-sm underline" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
