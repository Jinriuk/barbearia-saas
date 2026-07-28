"use client";

import { useEffect } from "react";
import {
  THEME_COOKIE,
  DEFAULT_THEME_PREFERENCE,
  type ThemePreference,
} from "@/lib/theme";

/**
 * Tema do painel (Fase 1.1). Antes a classe `dark` era forçada sem opção;
 * agora o tema vem da preferência gravada em Minha conta.
 *
 * A raiz do documento recebe os dois marcadores: a classe `dark` (que o
 * variante `dark:` do Tailwind usa) e o atributo `data-theme` do §11 — este
 * último é o que o gráfico do painel consulta. Os portais do Radix (sheet,
 * dropdown, dialog) montam em <body>, por isso os dois precisam ficar na raiz
 * do documento e não em um wrapper.
 *
 * O <script> inline roda durante o streaming, antes da pintura, e resolve
 * "Automático" pelo prefers-color-scheme — é o que evita o flash de tema
 * errado. Ao sair do painel o efeito limpa tudo: a landing e a página de
 * agendamento do cliente têm cores próprias e não seguem essa escolha.
 */
export function PanelTheme({
  preference = DEFAULT_THEME_PREFERENCE,
}: {
  preference?: ThemePreference;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: light)");

    const apply = () => {
      const theme =
        preference === "light" || preference === "dark"
          ? preference
          : media.matches
            ? "light"
            : "dark";
      root.dataset.theme = theme;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
    };

    apply();

    // Em "Automático" o tema acompanha o aparelho enquanto a aba fica aberta.
    if (preference === "system") media.addEventListener("change", apply);

    return () => {
      media.removeEventListener("change", apply);
      root.classList.remove("dark");
      delete root.dataset.theme;
      root.style.colorScheme = "";
    };
  }, [preference]);

  return (
    <script
      // O cookie é relido aqui porque numa navegação pelo roteador o HTML
      // deste layout pode vir do cache do cliente com a preferência anterior.
      dangerouslySetInnerHTML={{
        __html: `(function(){try{
var d=document.documentElement;
var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
var p=m?decodeURIComponent(m[1]):${JSON.stringify(preference)};
if(p!=="light"&&p!=="dark"&&p!=="system"){p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};}
var t=p==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;
d.dataset.theme=t;
d.classList.toggle("dark",t==="dark");
d.style.colorScheme=t;
}catch(e){document.documentElement.classList.add("dark");}})();`,
      }}
    />
  );
}
