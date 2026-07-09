"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

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
    window.fbq?.("track", "CompleteRegistration");
    router.replace("/dashboard", { scroll: false });
  }, [router]);
  return null;
}
