"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ImageUp,
  Lock,
  MessageCircle,
  Monitor,
  Palette,
  Scissors,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import { saveAllSettings } from "@/modules/settings/actions";
import { REAL_PHOTOS } from "@/lib/assets";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { success: false, message: "" };

const SECTIONS = [
  { value: "negocio", label: "Dados da barbearia", icon: Store },
  { value: "aparencia", label: "Aparência", icon: Palette },
  { value: "pagina", label: "Página de agendamento", icon: Sparkles },
  { value: "expediente", label: "Horário de funcionamento", icon: Clock },
  { value: "regras", label: "Regras de agendamento", icon: CalendarClock },
  { value: "lembretes", label: "Lembretes", icon: MessageCircle },
] as const;

type SectionKey = (typeof SECTIONS)[number]["value"];

const WEEKDAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

const DEFAULT_BACKGROUNDS = [
  { label: "Foto — Interior", url: REAL_PHOTOS.interior },
  { label: "Foto — Navalha", url: REAL_PHOTOS.razorShave },
  { label: "Foto — Corte", url: REAL_PHOTOS.barberCut },
  { label: "Navalha", url: "/backgrounds/navalha.svg" },
  { label: "Meia-noite", url: "/backgrounds/meia-noite.svg" },
  { label: "Linhas", url: "/backgrounds/linhas.svg" },
  { label: "Bronze", url: "/backgrounds/bronze.svg" },
  { label: "Esmeralda", url: "/backgrounds/esmeralda.svg" },
  { label: "Vinho", url: "/backgrounds/vinho.svg" },
  { label: "Aurora", url: "/backgrounds/aurora.svg" },
  { label: "Ondas", url: "/backgrounds/ondas.svg" },
  { label: "Grade", url: "/backgrounds/grade.svg" },
  { label: "Pétalas", url: "/backgrounds/petalas.svg" },
  { label: "Lavanda", url: "/backgrounds/lavanda.svg" },
  { label: "Champagne", url: "/backgrounds/champagne.svg" },
  { label: "Rosé noite", url: "/backgrounds/rose-noite.svg" },
];

const THEME_PRESETS = [
  { name: "Dourado clássico", primary: "#b8893e", secondary: "#171717", background: "#faf8f4" },
  { name: "Meia-noite", primary: "#d9a441", secondary: "#f4f1ea", background: "#101318" },
  { name: "Esmeralda", primary: "#2f9e77", secondary: "#10231c", background: "#f2f7f4" },
  { name: "Vinho nobre", primary: "#8e2f3c", secondary: "#241014", background: "#faf4f2" },
  { name: "Grafite & ouro", primary: "#e5b95c", secondary: "#ece9e2", background: "#141416" },
  { name: "Rosé", primary: "#b96a72", secondary: "#2a1a18", background: "#fbf3f1" },
  { name: "Rosé elegante", primary: "#c2497c", secondary: "#33202b", background: "#fdf8f5" },
  { name: "Lavanda suave", primary: "#8459b3", secondary: "#2f2440", background: "#f7f4fb" },
  { name: "Champagne", primary: "#b98a4f", secondary: "#3d2f1f", background: "#fbf7ef" },
];

export type SettingsValues = {
  businessName: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  backgroundType: "color" | "image";
  backgroundImageUrl: string;
  logoUrl: string;
  whatsappNumber: string;
  instagramUrl: string;
  address: string;
  whatsappRemindersEnabled: boolean;
  bookingNoticeMinutes: number;
  cancellationNoticeMinutes: number;
  bookingHorizonDays: number;
  bookingConfirmationMode: "manual" | "auto";
  maxPendingPerClient: number;
  openingHours: Record<string, string>;
};

/**
 * Configurações em seis seções, com prévia ao vivo e UM ÚNICO "Salvar
 * alterações" (Fase 3 — item 3.10 / §7.8).
 *
 * Antes era rolagem única de cartões independentes, cada um com o próprio
 * botão: o dono mudava a cor e o contato, salvava um, e saía perdendo o
 * outro sem perceber. Aqui tudo vive num formulário só.
 *
 * As seções inativas são ESCONDIDAS por CSS, não desmontadas — campo
 * desmontado não entra no FormData, e um "salvar tudo" que só grava a aba
 * aberta seria pior do que o problema original.
 */
export function SettingsWorkspace({
  initial,
  isPlus,
  slug,
  publicUrl,
}: {
  initial: SettingsValues;
  isPlus: boolean;
  slug: string;
  publicUrl: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveAllSettings,
    initialState,
  );
  const [section, setSection] = useState<SectionKey>("negocio");
  const [device, setDevice] = useState<"celular" | "computador">("celular");
  const [values, setValues] = useState<SettingsValues>(initial);
  const [dirty, setDirty] = useState(false);

  function set<K extends keyof SettingsValues>(
    key: K,
    value: SettingsValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  const show = (key: SectionKey) => (section === key ? "" : "hidden");

  return (
    <form
      action={(formData) => {
        setDirty(false);
        return formAction(formData);
      }}
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
    >
      <div className="min-w-0 space-y-5">
        <nav
          aria-label="Seções das configurações"
          className="-mx-1 overflow-x-auto px-1"
        >
          <ul className="flex min-w-max items-center gap-1 border-b">
            {SECTIONS.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => setSection(item.value)}
                  aria-current={section === item.value ? "true" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                    section === item.value
                      ? "border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground border-transparent",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {state.message ? (
          <Alert variant={state.success ? "default" : "destructive"}>
            {state.success ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : null}
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {/* 1. Dados da barbearia */}
        <section className={cn("space-y-4", show("negocio"))}>
          <SectionTitle
            title="Dados da barbearia"
            description="O nome aparece na sua página de agendamento, nas mensagens e no recibo. Podia ser digitado errado no cadastro e nunca mais corrigido — agora dá."
          />
          <div className="space-y-2">
            <Label htmlFor="businessName">Nome do negócio</Label>
            <Input
              id="businessName"
              name="businessName"
              value={values.businessName}
              onChange={(event) => set("businessName", event.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              name="address"
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
              maxLength={240}
              placeholder="Rua, número, bairro — cidade"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                inputMode="tel"
                value={values.whatsappNumber}
                onChange={(event) => set("whatsappNumber", event.target.value)}
                maxLength={30}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram</Label>
              <Input
                id="instagramUrl"
                name="instagramUrl"
                type="url"
                value={values.instagramUrl}
                onChange={(event) => set("instagramUrl", event.target.value)}
                placeholder="https://instagram.com/suabarbearia"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Endereço da sua página:{" "}
            <Link
              href={`/${slug}`}
              target="_blank"
              className="underline underline-offset-2"
            >
              {publicUrl}
            </Link>
          </p>
        </section>

        {/* 2. Aparência */}
        <section className={cn("space-y-5", show("aparencia"))}>
          <SectionTitle
            title="Aparência"
            description="Logo, cores e fundo da página que o seu cliente vê."
            badge={
              <Badge
                className={
                  isPlus
                    ? "bg-primary/10 text-primary border-transparent"
                    : "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                }
              >
                <Sparkles className="size-3" /> Plus
              </Badge>
            }
          />

          {!isPlus ? (
            <div className="bg-muted/40 flex flex-col items-start gap-3 rounded-xl border border-dashed p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Lock className="size-4" /> Personalização bloqueada no plano
                Padrão
              </p>
              <p className="text-muted-foreground text-sm">
                As demais seções continuam salvando normalmente. No Plus você
                deixa a área do cliente com a cara da sua barbearia.
              </p>
              <Button asChild type="button" variant="secondary">
                <a href="/#planos" target="_blank" rel="noreferrer">
                  Conhecer o Plus <ArrowRight />
                </a>
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            <Label htmlFor="logo">Logo da barbearia</Label>
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
              <div className="flex-1 space-y-1.5">
                <Input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={!isPlus}
                  className="h-auto py-2"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) set("logoUrl", URL.createObjectURL(file));
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  PNG, JPG ou WebP, até 4 MB.
                </p>
              </div>
            </div>
          </div>

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
                    onClick={() => {
                      setValues((prev) => ({
                        ...prev,
                        primaryColor: preset.primary,
                        secondaryColor: preset.secondary,
                        backgroundColor: preset.background,
                      }));
                      setDirty(true);
                    }}
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
              <>
                <div className="grid grid-cols-3 gap-2">
                  {DEFAULT_BACKGROUNDS.map((background) => (
                    <button
                      key={background.url}
                      type="button"
                      disabled={!isPlus}
                      onClick={() =>
                        set("backgroundImageUrl", background.url)
                      }
                      className={cn(
                        "relative h-16 overflow-hidden rounded-lg border-2 transition-all",
                        values.backgroundImageUrl === background.url
                          ? "border-primary"
                          : "border-transparent hover:border-black/20",
                      )}
                      style={{ background: `url("${background.url}") center/cover` }}
                      aria-label={`Fundo ${background.label}`}
                    >
                      <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {background.label}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="backgroundFile">
                    Ou envie sua própria imagem
                  </Label>
                  <Input
                    id="backgroundFile"
                    name="backgroundFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={!isPlus}
                    className="h-auto py-2"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        set("backgroundImageUrl", URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>

        {/* 3. Página de agendamento */}
        <section className={cn("space-y-4", show("pagina"))}>
          <SectionTitle
            title="Página de agendamento"
            description="O que o cliente lê ao abrir o seu link."
          />
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
              rows={2}
              value={values.heroSubtitle}
              onChange={(event) => set("heroSubtitle", event.target.value)}
              disabled={!isPlus}
              required
            />
          </div>
          {!isPlus ? (
            <p className="text-muted-foreground text-sm">
              Os textos da capa fazem parte da personalização do plano Plus.
            </p>
          ) : null}
        </section>

        {/* 4. Horário de funcionamento */}
        <section className={cn("space-y-4", show("expediente"))}>
          <SectionTitle
            title="Horário de funcionamento"
            description="Texto informativo exibido na sua página. A disponibilidade real de cada horário vem do expediente dos profissionais, em Equipe."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {WEEKDAYS.map((day) => (
              <div key={day.key} className="space-y-2">
                <Label htmlFor={`hours-${day.key}`}>{day.label}</Label>
                <Input
                  id={`hours-${day.key}`}
                  name={day.key}
                  value={values.openingHours[day.key] ?? ""}
                  onChange={(event) =>
                    set("openingHours", {
                      ...values.openingHours,
                      [day.key]: event.target.value,
                    })
                  }
                  maxLength={40}
                  placeholder="09:00–19:00 (vazio = fechado)"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 5. Regras de agendamento */}
        <section className={cn("space-y-4", show("regras"))}>
          <SectionTitle
            title="Regras de agendamento"
            description="Valem na hora para quem agenda pela sua página."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bookingNoticeMinutes">
                Antecedência mínima (minutos)
              </Label>
              <Input
                id="bookingNoticeMinutes"
                name="bookingNoticeMinutes"
                type="number"
                min="0"
                max="10080"
                value={values.bookingNoticeMinutes}
                onChange={(event) =>
                  set("bookingNoticeMinutes", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellationNoticeMinutes">
                Prazo de cancelamento (minutos)
              </Label>
              <Input
                id="cancellationNoticeMinutes"
                name="cancellationNoticeMinutes"
                type="number"
                min="0"
                max="10080"
                value={values.cancellationNoticeMinutes}
                onChange={(event) =>
                  set("cancellationNoticeMinutes", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingHorizonDays">
                Até quantos dias à frente
              </Label>
              <Input
                id="bookingHorizonDays"
                name="bookingHorizonDays"
                type="number"
                min="1"
                max="365"
                value={values.bookingHorizonDays}
                onChange={(event) =>
                  set("bookingHorizonDays", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPendingPerClient">
                Reservas em aberto por cliente
              </Label>
              <Input
                id="maxPendingPerClient"
                name="maxPendingPerClient"
                type="number"
                min="1"
                max="10"
                value={values.maxPendingPerClient}
                onChange={(event) =>
                  set("maxPendingPerClient", Number(event.target.value))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingConfirmationMode">
              Como o horário é confirmado
            </Label>
            <select
              id="bookingConfirmationMode"
              name="bookingConfirmationMode"
              value={values.bookingConfirmationMode}
              onChange={(event) =>
                set(
                  "bookingConfirmationMode",
                  event.target.value as "manual" | "auto",
                )
              }
              className="border-input bg-background h-10 w-full rounded-lg border px-2 text-sm"
            >
              <option value="manual">
                Eu confirmo cada horário (o cliente fica aguardando)
              </option>
              <option value="auto">
                Confirmação imediata (o horário já sai confirmado)
              </option>
            </select>
          </div>
        </section>

        {/* 6. Lembretes */}
        <section className={cn("space-y-4", show("lembretes"))}>
          <SectionTitle
            title="Lembretes"
            description="Aviso automático no WhatsApp na véspera do horário."
          />
          <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
            <input
              type="checkbox"
              name="whatsappRemindersEnabled"
              checked={values.whatsappRemindersEnabled}
              onChange={(event) =>
                set("whatsappRemindersEnabled", event.target.checked)
              }
              className="mt-0.5 size-4 rounded border"
            />
            <span>
              <span className="font-medium">
                Enviar lembrete de horário no WhatsApp
              </span>
              <span className="text-muted-foreground block">
                O cliente recebe o aviso um dia antes. Reduz falta sem você
                precisar mandar mensagem manualmente.
              </span>
            </span>
          </label>
        </section>

        {/* Barra de salvar — uma só, para tudo. */}
        <div className="bg-background/95 sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-xl border p-3 backdrop-blur lg:bottom-4">
          <Button disabled={pending} size="lg">
            {pending ? "Salvando…" : "Salvar alterações"}
          </Button>
          <p className="text-muted-foreground text-sm">
            {dirty
              ? "Você tem alterações não salvas em uma ou mais seções."
              : "Um botão salva as seis seções de uma vez."}
          </p>
        </div>
      </div>

      {/* Prévia ao vivo */}
      <div className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Prévia ao vivo
          </p>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <DeviceButton
              active={device === "celular"}
              onClick={() => setDevice("celular")}
              icon={<Smartphone className="size-4" />}
              label="Celular"
            />
            <DeviceButton
              active={device === "computador"}
              onClick={() => setDevice("computador")}
              icon={<Monitor className="size-4" />}
              label="Computador"
            />
          </div>
        </div>
        <div className={device === "celular" ? "mx-auto max-w-[320px]" : ""}>
          <PagePreview values={values} device={device} />
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Aproximação da capa da sua página. Para ver o resultado final,{" "}
          <Link
            href={`/${slug}`}
            target="_blank"
            className="underline underline-offset-2"
          >
            abra a página de agendamento
          </Link>
          .
        </p>
      </div>
    </form>
  );
}

function PagePreview({
  values,
  device,
}: {
  values: SettingsValues;
  device: "celular" | "computador";
}) {
  const background =
    values.backgroundType === "image" && values.backgroundImageUrl
      ? `linear-gradient(${hexA(values.backgroundColor, 0.82)}, ${hexA(values.backgroundColor, 0.82)}), url("${values.backgroundImageUrl}") center/cover`
      : values.backgroundColor;

  const openDays = WEEKDAYS.filter((day) => values.openingHours[day.key]);

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ background, color: values.secondaryColor }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span
            className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full"
            style={{
              background: values.primaryColor,
              color: values.secondaryColor,
            }}
          >
            {values.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Scissors className="size-3" />
            )}
          </span>
          <span className="truncate">
            {values.businessName || "Sua barbearia"}
          </span>
        </span>
        <span
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium"
          style={{
            background: values.primaryColor,
            color: values.secondaryColor,
          }}
        >
          Agendar
        </span>
      </div>
      <div className={cn("px-4 pt-3 pb-6", device === "computador" && "px-6")}>
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
          {values.bookingConfirmationMode === "auto"
            ? "Confirmação imediata"
            : "Agenda aberta"}
        </p>
        <p
          className={cn(
            "mt-2.5 leading-tight font-semibold tracking-tight",
            device === "computador" ? "text-2xl" : "text-xl",
          )}
        >
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
          {values.whatsappNumber ? (
            <span
              className="inline-block rounded-full border px-3.5 py-1.5 text-xs font-medium"
              style={{ borderColor: hexA(values.secondaryColor, 0.25) }}
            >
              WhatsApp
            </span>
          ) : null}
        </div>
        {values.address ? (
          <p className="mt-4 text-[11px] opacity-70">{values.address}</p>
        ) : null}
        {openDays.length ? (
          <div
            className="mt-3 space-y-0.5 border-t pt-3 text-[11px] opacity-70"
            style={{ borderColor: hexA(values.secondaryColor, 0.15) }}
          >
            {openDays.slice(0, 3).map((day) => (
              <p key={day.key}>
                {day.label}: {values.openingHours[day.key]}
              </p>
            ))}
            {openDays.length > 3 ? (
              <p>+ {openDays.length - 3} dias</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge}
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
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
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-md border bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Escolher cor ${label.toLowerCase()}`}
        />
        <Input
          id={name}
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

function hexA(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}
