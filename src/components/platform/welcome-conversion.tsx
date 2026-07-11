"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredConsent } from "@/lib/consent";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Disparo one-shot da conversão de cadastro: o onboarding redireciona para
 * /dashboard?bemvindo=1 e este componente marca CompleteRegistration no Meta
 * Pixel (quando configurado). Em seguida limpa o parâmetro da URL para o
 * evento não repetir em refresh/compartilhamento.
 */
export function WelcomeConversion() {
  const router = useRouter();
  useEffect(() => {
    // Gate explícito de consentimento (LGPD): não basta fbq estar indefinido
    // — outro script poderia definir window.fbq e o evento dispararia sem
    // base legal. É a mesma checagem que condiciona o <MetaPixel/>.
    if (getStoredConsent() === "granted") {
      window.fbq?.("track", "CompleteRegistration");
    }
    router.replace("/dashboard", { scroll: false });
  }, [router]);
  return null;
}
