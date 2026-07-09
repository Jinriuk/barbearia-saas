import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { signOut } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Super-admin — NexoBarber" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlatformAdmin();

  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl">
              <ShieldCheck className="size-4" />
            </span>
            NexoBarber · Plataforma
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:block">
              {user.email}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Meu painel</Link>
            </Button>
            <form action={signOut}>
              <Button variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
