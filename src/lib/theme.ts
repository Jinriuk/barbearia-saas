/**
 * Preferência de tema do painel (§1, §7.9 e §11 do guia visual).
 *
 * O painel é dark-first: sem escolha registrada ele continua escuro, como
 * sempre foi. O guia permite ("pode") seguir o aparelho na primeira visita,
 * mas não obriga — deixar o padrão em escuro evita virar o tema de quem já
 * usa o produto hoje. Quem quiser o comportamento do aparelho escolhe
 * "Automático" em Minha conta.
 *
 * A escolha vive num cookie legível pelo servidor para que o HTML já saia
 * com o tema certo; o <script> inline de PanelTheme resolve "system" antes
 * da pintura, evitando o flash.
 */
export const THEME_COOKIE = "nb-theme";

/** Um ano — a escolha de tema é uma preferência estável, não uma sessão. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Automático",
};

export const THEME_DESCRIPTIONS: Record<ThemePreference, string> = {
  light: "Fundo claro, para salões com muita luz natural.",
  dark: "Fundo escuro, o padrão do NexoBarber.",
  system: "Segue o que o seu celular ou computador estiver usando.",
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

export function parseThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_THEME_PREFERENCE;
}
