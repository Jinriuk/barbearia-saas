"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { setThemePreference } from "@/modules/account/theme-actions";
import {
  THEME_DESCRIPTIONS,
  THEME_LABELS,
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme";
import type { ActionState } from "@/types/domain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: ActionState = { success: false, message: "" };

const icons: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Escolha do tema do painel (§7.9). Salva no clique e sem botão de confirmar:
 * é uma mudança sem risco, e o resultado aparece na própria tela. O
 * router.refresh() faz o layout reenviar a preferência para o PanelTheme.
 */
export function ThemeForm({ initial }: { initial: ThemePreference }) {
  const router = useRouter();
  const [state, formAction] = useActionState(setThemePreference, initialState);
  const [selected, setSelected] = useState<ThemePreference>(initial);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aparência</CardTitle>
        <CardDescription>
          Vale para este aparelho e fica salvo para as próximas visitas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <fieldset>
            <legend className="sr-only">Tema do painel</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEME_PREFERENCES.map((option) => {
                const Icon = icons[option];
                const active = selected === option;
                return (
                  <label
                    key={option}
                    className={cn(
                      "focus-within:ring-focus-ring/45 focus-within:border-focus-ring flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors focus-within:ring-3",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border-control hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={option}
                      checked={active}
                      className="sr-only"
                      onChange={(event) => {
                        setSelected(option);
                        event.currentTarget.form?.requestSubmit();
                      }}
                    />
                    <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">
                        {THEME_LABELS[option]}
                      </span>
                      <span className="text-foreground-subtle text-sm">
                        {THEME_DESCRIPTIONS[option]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <p aria-live="polite" className="text-foreground-subtle mt-3 text-sm">
            {state.message}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
