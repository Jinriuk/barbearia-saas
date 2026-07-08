"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Botão de impressão para o relatório. Também dispara o diálogo de impressão
 * automaticamente ao abrir (o usuário escolhe "Salvar como PDF").
 */
export function PrintButton({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(timer);
  }, [auto]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex h-10 items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
    >
      <Printer className="size-4" /> Imprimir / Salvar PDF
    </button>
  );
}
