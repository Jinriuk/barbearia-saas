"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";

/**
 * Fallback de erro para toda rota abaixo do layout raiz: mensagem amigável
 * em PT-BR com o digest visível (o mesmo que aparece nos logs do servidor),
 * para o suporte localizar a causa sem depender de print.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-stone-950 px-6 text-stone-100">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Algo deu errado por aqui
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">
          Já registramos o problema. Tente novamente em instantes — se
          persistir, fale com o suporte informando o código abaixo.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-stone-500">
            código: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          >
            <RotateCcw className="size-4" /> Tentar de novo
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-stone-700 px-4 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-900"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
