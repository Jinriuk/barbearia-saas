"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ImageUp,
  Lock,
  Palette,
  Scissors,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  saveAppearanceSettings,
  uploadBackgroundImage,
  uploadLogo,
} from "@/modules/settings/actions";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

const DEFAULT_BACKGROUNDS = [
  { label: "Navalha", url: "/backgrounds/navalha.svg" },
  { label: "Meia-noite", url: "/backgrounds/meia-noite.svg" },
  { label: "Linhas", url: "/backgrounds/linhas.svg" },
  { label: "Bronze", url: "/backgrounds/bronze.svg" },
  { label: "Esmeralda", url: "/backgrounds/esmeralda.svg" },
  { label: "Vinho", url: "/backgrounds/vinho.svg" },
  { label: "Aurora", url: "/backgrounds/aurora.svg" },
  { label: "Ondas", url: "/backgrounds/ondas.svg" },
  { label: "Grade", url: "/backgrounds/grade.svg" },
];

/** Temas prontos: um clique define destaque, escura e fundo em harmonia. */
const THEME_PRESETS = [
  { name: "Dourado clássico", primary: "#b8893e", secondary: "#171717", background: "#faf8f4" },
  { name: "Meia-noite", primary: "#d9a441", secondary: "#f4f1ea", background: "#101318" },
  { name: "Esmeralda", primary: "#2f9e77", secondary: "#10231c", background: "#f2f7f4" },
  { name: "Vinho nobre", primary: "#8e2f3c", secondary: "#241014", background: "#faf4f2" },
  { name: "Grafite & ouro", primary: "#e5b95c", secondary: "#ece9e2", background: "#141416" },
  { name: "Rosé", primary: "#b96a72", secondary: "#2a1a18", background: "#fbf3f1" },
];

type Appearance = {
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  backgroundType: "color" | "image";
  backgroundImageUrl: string;
  logoUrl: string;
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
  const [logoState, logoAction, logoPending] = useActionState(
    uploadLogo,
    initialState,
  );
  const [bgState, bgAction, bgPending] = useActionState(
    uploadBackgroundImage,
    initialState,
  );

  const [values, setValues] = useState<Appearance>(initial);

  function set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const previewBackground =
    values.backgroundType === "image" && values.backgroundImageUrl
      ? `linear-gradient(${hexA(values.backgroundColor, 0.82)}, ${hexA(values.backgroundColor, 0.82)}), url("${values.backgroundImageUrl}") center/cover`
      : values.backgroundColor;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">
            Identidade Visual da Página de Agendamento
          </CardTitle>
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
            ? "Logo, cores, textos e fundo da sua página. O preview atualiza em tempo real."
            : "No plano Plus você personaliza logo, cores, textos e fundo. O Padrão usa um layout fixo e bem acabado."}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo da barbearia</Label>
              <div className="flex items-center gap-4">
                <span className="bg-muted grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border">
                  {values.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={values.logoUrl}
                      alt="Logo atual"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Scissors className="text-muted-foreground size-6" />
                  )}
                </span>
                <form action={logoAction} className="flex-1 space-y-2">
                  <input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!isPlus || logoPending}
                    className="text-muted-foreground file:bg-muted file:text-foreground block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isPlus || logoPending}
                  >
                    <Upload className="size-3.5" />
                    {logoPending ? "Enviando…" : "Enviar logo"}
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    PNG, JPG ou WebP, até 4 MB. Substitui a logo do cabeçalho.
                  </p>
                </form>
              </div>
              {logoState.message ? (
                <Alert
                  variant={logoState.success ? "default" : "destructive"}
                  className="py-2"
                >
                  {logoState.success ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : null}
                  <AlertDescription>{logoState.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            {/* Cores + textos + fundo */}
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
                  onChange={(e) => set("heroTitle", e.target.value)}
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
                  onChange={(e) => set("heroSubtitle", e.target.value)}
                  disabled={!isPlus}
                  required
                />
              </div>
              {/* Temas prontos */}
              <div className="space-y-2">
                <Label>Temas prontos</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {THEME_PRESETS.map((preset) => {
                    const active =
                      values.primaryColor === preset.primary &&
                      values.secondaryColor === preset.secondary &&
                      values.backgroundColor === preset.background;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={!isPlus}
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            primaryColor: preset.primary,
                            secondaryColor: preset.secondary,
                            backgroundColor: preset.background,
                          }))
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-all disabled:opacity-50",
                          active
                            ? "border-primary bg-primary/5"
                            : "hover:border-black/20 hover:bg-muted/40 dark:hover:border-white/20",
                        )}
                        aria-label={`Aplicar tema ${preset.name}`}
                      >
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full border"
                          style={{ background: preset.background }}
                        >
                          <span
                            className="size-3.5 rounded-full"
                            style={{
                              background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.secondary} 50%)`,
                            }}
                          />
                        </span>
                        <span className="truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField
                  label="Destaque"
                  name="primaryColor"
                  value={values.primaryColor}
                  onChange={(v) => set("primaryColor", v)}
                  disabled={!isPlus}
                />
                <ColorField
                  label="Escura"
                  name="secondaryColor"
                  value={values.secondaryColor}
                  onChange={(v) => set("secondaryColor", v)}
                  disabled={!isPlus}
                />
                <ColorField
                  label="Fundo"
                  name="backgroundColor"
                  value={values.backgroundColor}
                  onChange={(v) => set("backgroundColor", v)}
                  disabled={!isPlus}
                />
              </div>

              {/* Modo de fundo */}
              <div className="space-y-3">
                <Label>Fundo da página</Label>
                <input
                  type="hidden"
                  name="backgroundType"
                  value={values.backgroundType}
                />
                <input
                  type="hidden"
                  name="backgroundImageUrl"
                  value={values.backgroundImageUrl}
                />
                <div className="flex gap-2">
                  <ModeButton
                    active={values.backgroundType === "color"}
                    disabled={!isPlus}
                    onClick={() => set("backgroundType", "color")}
                    icon={<Palette className="size-4" />}
                    label="Cor"
                  />
                  <ModeButton
                    active={values.backgroundType === "image"}
                    disabled={!isPlus}
                    onClick={() => set("backgroundType", "image")}
                    icon={<ImageUp className="size-4" />}
                    label="Imagem"
                  />
                </div>

                {values.backgroundType === "image" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {DEFAULT_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.url}
                        type="button"
                        disabled={!isPlus}
                        onClick={() => set("backgroundImageUrl", bg.url)}
                        className={cn(
                          "relative h-16 overflow-hidden rounded-lg border-2 transition-all",
                          values.backgroundImageUrl === bg.url
                            ? "border-primary"
                            : "border-transparent hover:border-black/20",
                        )}
                        style={{
                          background: `url("${bg.url}") center/cover`,
                        }}
                        aria-label={`Fundo ${bg.label}`}
                      >
                        <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {bg.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
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
                    Faça upgrade para o Plus e deixe a área do cliente com a cara
                    da sua barbearia.
                  </p>
                  <Button type="button" variant="secondary">
                    Conhecer o Plus <ArrowRight />
                  </Button>
                </div>
              )}
            </form>

            {/* Upload de fundo próprio */}
            {isPlus && values.backgroundType === "image" ? (
              <form action={bgAction} className="space-y-2">
                <Label>Ou envie sua própria imagem de fundo</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    name="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={bgPending}
                    className="text-muted-foreground file:bg-muted file:text-foreground text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
                  />
                  <Button size="sm" variant="outline" disabled={bgPending}>
                    <Upload className="size-3.5" />
                    {bgPending ? "Enviando…" : "Enviar fundo"}
                  </Button>
                </div>
                {bgState.message ? (
                  <Alert
                    variant={bgState.success ? "default" : "destructive"}
                    className="py-2"
                  >
                    {bgState.success ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : null}
                    <AlertDescription>{bgState.message}</AlertDescription>
                  </Alert>
                ) : null}
              </form>
            ) : null}
          </div>

          {/* Preview */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Preview ao vivo
            </p>
            <div
              className="overflow-hidden rounded-2xl border shadow-sm"
              style={{ background: previewBackground, color: values.secondaryColor }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className="grid size-6 place-items-center overflow-hidden rounded-full"
                    style={{
                      background: values.primaryColor,
                      color: values.secondaryColor,
                    }}
                  >
                    {values.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={values.logoUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Scissors className="size-3" />
                    )}
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
              <div className="px-4 pt-3 pb-6">
                <p
                  className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: values.primaryColor }}
                >
                  <span className="relative flex size-1.5">
                    <span
                      className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
                      style={{ background: values.primaryColor }}
                    />
                    <span
                      className="relative inline-flex size-1.5 rounded-full"
                      style={{ background: values.primaryColor }}
                    />
                  </span>
                  Agenda aberta
                </p>
                <p className="mt-2.5 text-xl leading-tight font-semibold tracking-tight">
                  {values.heroTitle || "Seu título aqui"}
                </p>
                <p className="mt-2 text-xs opacity-70">
                  {values.heroSubtitle || "Seu subtítulo aqui"}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block rounded-full px-3.5 py-1.5 text-xs font-medium"
                    style={{
                      background: values.secondaryColor,
                      color: values.backgroundColor,
                    }}
                  >
                    Agendar horário
                  </span>
                  <span
                    className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-medium"
                    style={{ borderColor: hexA(values.secondaryColor, 0.25) }}
                  >
                    WhatsApp
                  </span>
                </div>
                <p
                  className="mt-4 text-[10px] font-medium"
                  style={{ color: values.primaryColor }}
                >
                  ✦ Reserva em menos de 1 minuto
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function hexA(hex: string, alpha: number) {
  const v = hex.replace("#", "");
  const full =
    v.length === 3
      ? v
          .split("")
          .map((c) => c + c)
          .join("")
      : v;
  const int = Number.parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors disabled:opacity-50",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "hover:bg-muted/50",
      )}
    >
      {icon}
      {label}
    </button>
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
