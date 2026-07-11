"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getStoredConsent,
  storeConsent,
  subscribeConsent,
} from "@/lib/consent";

// Sentinela do render no servidor: mantém o banner oculto no HTML inicial e
// evita flash para quem já escolheu (a leitura real acontece na hidratação).
const SSR = "ssr" as const;

/**
 * Aviso de cookies exigido pela LGPD para os cookies de MEDIÇÃO (Meta Pixel).
 * Só aparece quando o pixel está configurado e o visitante ainda não
 * escolheu; sem pixel não há cookie não-essencial, logo não há banner.
 */
export function ConsentBanner() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const choice = useSyncExternalStore(
    subscribeConsent,
    getStoredConsent,
    () => SSR,
  );

  if (!pixelId || choice !== null) return null;

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-stone-700 bg-stone-900/95 p-4 text-stone-100 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <p className="text-sm leading-relaxed">
        Usamos cookies de medição para saber se nossos anúncios funcionam.
        Cookies essenciais (login e agendamento) não dependem desta escolha.{" "}
        <Link
          href="/privacidade"
          className="underline underline-offset-4 hover:text-white"
        >
          Saiba mais
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => storeConsent("denied")}
          className="h-9 rounded-lg border border-stone-600 px-4 text-sm font-medium transition-colors hover:bg-stone-800"
        >
          Só o essencial
        </button>
        <button
          type="button"
          onClick={() => storeConsent("granted")}
          className="h-9 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
