"use client";

import { useEffect } from "react";

/**
 * Painel dark-first (Fase 1): aplica a classe `dark` no <html> enquanto o
 * usuário está no painel e remove ao sair (a página pública do cliente e a
 * landing continuam claras). O <script> inline aplica a classe já durante o
 * streaming do HTML, evitando o flash claro antes da hidratação; os portais
 * do Radix (sheet, dropdown, dialog) montam em <body>, por isso a classe
 * precisa estar na raiz do documento e não em um wrapper.
 */
export function PanelTheme() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `document.documentElement.classList.add("dark");`,
      }}
    />
  );
}
