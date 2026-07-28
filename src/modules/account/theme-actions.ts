"use server";

import { cookies } from "next/headers";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import type { ActionState } from "@/types/domain";

/**
 * Grava a preferência de tema (§7.9). O cookie não é httpOnly de propósito:
 * o <script> anti-flash de PanelTheme precisa lê-lo no cliente quando a
 * navegação é feita pelo roteador e o HTML não vem do servidor.
 */
export async function setThemePreference(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const value = formData.get("theme");
  const theme: ThemePreference = parseThemePreference(
    typeof value === "string" ? value : null,
  );

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });

  return { success: true, message: "Tema atualizado." };
}
