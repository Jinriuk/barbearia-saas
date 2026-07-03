"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Scissors,
  Sparkles,
} from "lucide-react";
import { saveAppearanceSettings } from "@/modules/settings/actions";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

type Appearance = {
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
};

export function AppearanceEditor({
  initial,
  isPlus,
  slug,
}: {
  initial: Appearance;
  isPlus: boolean;
  slug: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveAppearanceSettings,
    initialState,
  );
  const [values, setValues] = useState<Appearance>(initial);

  function set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Identidade visual</CardTitle>
          <Badge
            className={
              isPlus
                ? "bg-primary/10 text-primary border-transparent"
                : "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
            }
          >
            <Sparkles className="size-3" /> Plus
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {isPlus
            ? "Personalize cores e textos da área do cliente. As mudanças aparecem em tempo real no preview."
            : "No plano Plus você personaliza cores e textos da sua página. O plano Padrão usa um layout fixo e bem acabado."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <form action={formAction} className="space-y-5">
            {state.message ? (
              <Alert variant={state.success ? "default" : "destructive"}>
                {state.success ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : null}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Título principal</Label>
              <Input
                id="heroTitle"
                name="heroTitle"
                value={values.heroTitle}
                onChange={(event) => set("heroTitle", event.target.value)}
                disabled={!isPlus}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Subtítulo</Label>
              <Textarea
                id="heroSubtitle"
                name="heroSubtitle"
                value={values.heroSubtitle}
                onChange={(event) => set("heroSubtitle", event.target.value)}
                disabled={!isPlus}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField
                label="Destaque"
                name="primaryColor"
                value={values.primaryColor}
                onChange={(value) => set("primaryColor", value)}
                disabled={!isPlus}
              />
              <ColorField
                label="Escura"
                name="secondaryColor"
                value={values.secondaryColor}
                onChange={(value) => set("secondaryColor", value)}
                disabled={!isPlus}
              />
              <ColorField
                label="Fundo"
                name="backgroundColor"
                value={values.backgroundColor}
                onChange={(value) => set("backgroundColor", value)}
                disabled={!isPlus}
              />
            </div>
            {isPlus ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={pending}>
                  {pending ? "Salvando…" : "Salvar identidade"}
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${slug}`} target="_blank">
                    Ver página pública
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="bg-muted/40 flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="size-4" /> Personalização bloqueada no plano
                  Padrão
                </p>
                <p className="text-muted-foreground text-sm">
                  Faça upgrade para o Plus e deixe a área do cliente 100% com a
                  cara da sua barbearia.
                </p>
                <Button type="button" variant="secondary">
                  Conhecer o Plus <ArrowRight />
                </Button>
              </div>
            )}
          </form>

          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Preview ao vivo
            </p>
            <div
              className="overflow-hidden rounded-2xl border shadow-sm"
              style={{
                background: values.backgroundColor,
                color: values.secondaryColor,
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="grid size-6 place-items-center rounded-full"
                    style={{
                      background: values.primaryColor,
                      color: values.secondaryColor,
                    }}
                  >
                    <Scissors className="size-3" />
                  </span>
                  Sua barbearia
                </span>
                <span
                  className="rounded-md px-2 py-1 text-xs font-medium"
                  style={{
                    background: values.primaryColor,
                    color: values.secondaryColor,
                  }}
                >
                  Agendar
                </span>
              </div>
              <div className="px-4 pt-2 pb-6">
                <p
                  className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: values.primaryColor }}
                >
                  Agenda aberta
                </p>
                <p className="mt-2 text-xl leading-tight font-semibold">
                  {values.heroTitle || "Seu título aqui"}
                </p>
                <p className="mt-2 text-xs opacity-70">
                  {values.heroSubtitle || "Seu subtítulo aqui"}
                </p>
                <span
                  className="mt-4 inline-block rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: values.secondaryColor,
                    color: values.backgroundColor,
                  }}
                >
                  Escolher meu horário
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={name}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={label}
        />
        <Input
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}
