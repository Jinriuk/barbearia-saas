import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Layout das páginas legais (privacidade/termos): documento neutro às duas
 * verticais, legível e imprimível, com volta rápida para a página anterior.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-800">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
        >
          <ArrowLeft className="size-4" /> Voltar ao início
        </Link>
        <main className="prose-legal mt-8">{children}</main>
        <footer className="mt-14 border-t border-stone-200 pt-6 text-xs text-stone-400">
          NexoBarber · NexoBeleza — plataforma de agendamento para barbearias e
          salões de beleza.
        </footer>
      </div>
    </div>
  );
}
