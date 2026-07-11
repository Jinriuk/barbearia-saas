"use client";

/**
 * Consentimento de cookies de medição (LGPD): a escolha vive no navegador e
 * vale para todo o site. Cookies essenciais de sessão não passam por aqui —
 * só o que é marketing/medição (Meta Pixel) depende de "granted".
 */
const STORAGE_KEY = "nexo-consent-v1";
const EVENT_NAME = "nexo-consent-change";

export type ConsentChoice = "granted" | "denied";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function storeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Navegação privada/bloqueio de storage: segue sem persistir (o banner
    // voltará na próxima visita, o que é o comportamento conservador certo).
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: choice }));
}

function onConsentChange(listener: (choice: ConsentChoice) => void) {
  const handler = (event: Event) => {
    listener((event as CustomEvent<ConsentChoice>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

/** Assinatura no formato do useSyncExternalStore (só notifica mudança). */
export function subscribeConsent(callback: () => void) {
  return onConsentChange(() => callback());
}
