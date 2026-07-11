"use client";

import { RotateCcw } from "lucide-react";

/**
 * Erro na página pública do estabelecimento (ex.: banco indisponível no
 * meio do agendamento). Visual neutro que funciona sobre o tema de qualquer
 * tenant, com retry — o cliente final não pode ficar numa tela técnica.
 */
export default function TenantError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Não conseguimos carregar a página agora
        </h1>
        <p className="mt-2 text-sm leading-relaxed opacity-60">
          Pode ser uma instabilidade momentânea. Tente de novo — seu horário
          não foi perdido.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs opacity-40">
            código: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-current/20 px-6 text-sm font-medium transition-colors hover:bg-current/[.05]"
        >
          <RotateCcw className="size-4" /> Tentar de novo
        </button>
      </div>
    </main>
  );
}
