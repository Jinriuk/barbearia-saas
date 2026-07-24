import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  Check,
  Flower2,
  Heart,
  Palette,
  QrCode,
  Quote,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { SALON_PHOTOS, SALON_STOCK } from "@/lib/assets";
import { formatPriceBRL } from "@/lib/billing";
import { loadPlanCatalog } from "@/lib/billing/catalog";
import { LeadCaptureForm } from "@/components/platform/lead-capture-form";
import { Reveal } from "@/components/public-site/reveal";
import { Parallax } from "@/components/public-site/parallax";
import { SmartImage } from "@/components/public-site/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "NexoBeleza — o sistema completo para o seu salão de beleza",
  description:
    "Agenda online, financeiro automático, clientes, estoque e uma página de agendamento linda com a sua marca. 7 dias grátis.",
};

const features = [
  {
    icon: CalendarCheck,
    title: "Agenda sempre cheia, nunca bagunçada",
    description:
      "Horários duplicados são bloqueados na raiz. Escova, coloração e manicure convivem na mesma agenda, sem choque.",
  },
  {
    icon: Smartphone,
    title: "Sua cliente agenda sozinha",
    description:
      "Ela escolhe o serviço, a profissional e o horário na sua página — do celular, a qualquer hora, sem baixar nada.",
  },
  {
    icon: Banknote,
    title: "Financeiro que se preenche sozinho",
    description:
      "Atendimento concluído vira receita na hora. Dia, semana e mês fechados sem caderninho e sem planilha.",
  },
  {
    icon: Heart,
    title: "Clientes que voltam sempre",
    description:
      "Histórico completo de cada cliente: serviços, preferências e observações para um atendimento que encanta.",
  },
  {
    icon: UsersRound,
    title: "Equipe organizada, cada uma no seu",
    description:
      "Recepção, gerente e profissionais: cada pessoa vê só o que precisa. Comissões calculadas automaticamente.",
  },
  {
    icon: Palette,
    title: "Uma página com a sua cara",
    description:
      "Logo, cores, fotos e temas prontos. Sua página de agendamento fica tão linda quanto o seu trabalho.",
  },
];

const steps = [
  {
    step: "01",
    title: "Crie sua conta",
    description: "Nome do seu salão, endereço da página e pronto — é seu.",
  },
  {
    step: "02",
    title: "Monte seu catálogo",
    description:
      "Serviços, preços, profissionais e horários de atendimento de cada uma.",
  },
  {
    step: "03",
    title: "Compartilhe o link",
    description:
      "No Instagram, no WhatsApp e no QR Code da recepção. As reservas caem direto na agenda.",
  },
];

const themes = [
  { name: "Rosé elegante", bg: "#fdf6f3", ink: "#3a2430", accent: "#c2497c" },
  { name: "Lavanda suave", bg: "#f7f4fb", ink: "#2f2440", accent: "#8459b3" },
  { name: "Champagne", bg: "#fbf7ef", ink: "#3d2f1f", accent: "#b98a4f" },
];

const testimonials = [
  {
    quote:
      "Minha agenda vivia no papel e no WhatsApp. Hoje as clientes marcam sozinhas e eu foco no que amo: atender.",
    name: "Camila",
    role: "Dona de salão, 3 profissionais",
  },
  {
    quote:
      "O financeiro fechar sozinho no fim do dia mudou minha vida. Sei exatamente quanto entrou e de qual serviço.",
    name: "Patrícia",
    role: "Cabeleireira e gestora",
  },
  {
    quote:
      "Coloquei o link na bio do Instagram. As meninas agendam escova de madrugada e eu só confirmo de manhã.",
    name: "Juliana",
    role: "Studio de beleza, 5 cadeiras",
  },
];

const marqueeItems = [
  "Coloração",
  "Escova e penteados",
  "Manicure e pedicure",
  "Maquiagem",
  "Cílios e sobrancelhas",
  "Depilação",
  "Tratamentos capilares",
  "Estética facial",
];

const agendaPreview = [
  { time: "09:00", client: "Larissa Mota", service: "Coloração + corte" },
  { time: "10:30", client: "Fernanda Dias", service: "Escova modelada" },
  { time: "11:15", client: "Beatriz Nunes", service: "Manicure e pedicure" },
];

export const revalidate = 3600;

export default async function SalonLandingPage() {
  // Preço da fonte de verdade (catálogo no banco — Fase 2B); a página segue
  // estática com revalidação horária.
  const catalog = await loadPlanCatalog();
  return (
    <main className="min-h-screen overflow-x-clip bg-[#fdf8f5] text-[#33202b]">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-[#33202b]/[.06] bg-[#fdf8f5]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/salao"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#c2497c] text-white shadow-lg shadow-[#c2497c]/30">
              <Flower2 className="size-4" />
            </span>
            NexoBeleza
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#33202b]/60 md:flex">
            <a
              href="#recursos"
              className="transition-colors hover:text-[#33202b]"
            >
              Recursos
            </a>
            <a
              href="#como-funciona"
              className="transition-colors hover:text-[#33202b]"
            >
              Como funciona
            </a>
            <a
              href="#planos"
              className="transition-colors hover:text-[#33202b]"
            >
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-[#33202b]/80 hover:bg-[#33202b]/[.05] hover:text-[#33202b]"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="btn-shine bg-[#c2497c] text-white shadow-lg shadow-[#c2497c]/25 hover:bg-[#a93a69]"
            >
              <Link href="/cadastro?vertical=salon">Testar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="animate-orb absolute -top-44 -left-40 size-[34rem] rounded-full bg-[#e78bb0]/[.28] blur-[130px]" />
          <div className="animate-orb-late absolute top-20 -right-48 size-[38rem] rounded-full bg-[#e2a34c]/[.2] blur-[140px]" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(51,32,43,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(51,32,43,.035) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage:
                "radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28 lg:pb-36">
          <div className="max-w-3xl">
            <Badge className="motion-safe:animate-in motion-safe:fade-in mb-7 border-[#c2497c]/25 bg-[#c2497c]/10 text-[#a93a69] duration-700">
              <Sparkles className="size-3" />
              Plataforma completa para salões de beleza
            </Badge>
            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 text-5xl font-semibold tracking-[-0.045em] text-balance duration-700 sm:text-7xl">
              Seu salão cheio,{" "}
              <span className="animate-gradient-pan bg-gradient-to-r from-[#c2497c] via-[#d9832f] to-[#c2497c] bg-clip-text font-serif text-transparent italic">
                sua agenda leve
              </span>
              .
            </h1>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-7 max-w-2xl text-lg leading-8 text-[#33202b]/60 delay-150 duration-1000">
              O sistema que cuida do seu negócio inteiro: agenda sem choque de
              horários, financeiro que se preenche sozinho, clientes, equipe,
              estoque — e uma página de agendamento linda, com a sua marca.
            </p>
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mt-10 flex flex-col gap-3 delay-200 duration-1000 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="btn-shine h-13 w-full rounded-full bg-[#c2497c] px-8 text-[15px] text-white shadow-xl shadow-[#c2497c]/25 hover:bg-[#a93a69] sm:w-auto"
              >
                <Link href="/cadastro?vertical=salon">
                  Começar 7 dias grátis <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 w-full rounded-full border-[#33202b]/15 bg-white/60 px-7 text-[15px] text-[#33202b] hover:bg-white sm:w-auto"
              >
                <Link href="/studio-aurora">Ver página de demonstração</Link>
              </Button>
            </div>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-4 text-sm text-[#33202b]/45 delay-300 duration-1000">
              A partir de {formatPriceBRL(catalog.starter.monthlyCents)}/mês · 7
              dias grátis · cancele quando quiser
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#33202b]/55">
              {[
                "Sem app para a cliente",
                "Pronto em minutos",
                "Suporte em português",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-[#c2497c]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Colagem visual: foto + cards flutuantes */}
          <div className="relative hidden sm:block">
            <Parallax speed={-0.06}>
              <div className="relative overflow-hidden rounded-[2rem] border border-[#33202b]/10 shadow-2xl shadow-[#c2497c]/15">
                <SmartImage
                  src={SALON_PHOTOS.hairStyling}
                  fallbackSrc={SALON_STOCK.blush}
                  alt="Profissional finalizando escova em cliente no salão"
                  width={760}
                  height={560}
                  className="h-[460px] w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#33202b]/35 via-transparent to-transparent" />
              </div>
            </Parallax>
            <div className="animate-float absolute -top-6 -left-8 rounded-2xl border border-[#33202b]/[.07] bg-white/95 px-5 py-4 shadow-xl shadow-[#33202b]/[.08] backdrop-blur [animation-delay:1.4s]">
              <p className="text-xs text-[#33202b]/50">Recebido no mês</p>
              <p className="mt-0.5 font-mono text-xl font-semibold text-emerald-600">
                R$ 12.480
              </p>
            </div>
            <div className="animate-float-slow absolute -right-6 -bottom-10 w-72 rounded-2xl border border-[#33202b]/[.07] bg-white/95 p-4 shadow-xl shadow-[#33202b]/[.08] backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#33202b]/50">Hoje na agenda</p>
                <CalendarCheck className="size-4 text-[#c2497c]" />
              </div>
              <p className="mt-1 text-xl font-semibold">14 horários</p>
              <div className="mt-3 space-y-2">
                {agendaPreview.map((item) => (
                  <div
                    key={item.time}
                    className="flex items-center gap-3 rounded-xl bg-[#fdf6f3] px-3 py-2"
                  >
                    <span className="font-mono text-xs font-semibold text-[#c2497c]">
                      {item.time}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {item.client}
                      </p>
                      <p className="truncate text-[10px] text-[#33202b]/45">
                        {item.service}
                      </p>
                    </div>
                    <span className="ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marquee de serviços ===== */}
      <div className="border-y border-[#33202b]/[.06] bg-white/50 py-4">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="flex items-center gap-3 text-sm font-medium tracking-wide text-[#33202b]/45 uppercase"
              >
                <Flower2 className="size-3.5 text-[#c2497c]/70" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Recursos ===== */}
      <section
        id="recursos"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
      >
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            Recursos
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que o seu salão precisa,{" "}
            <span className="font-serif text-[#c2497c] italic">
              em um lugar só
            </span>
            .
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 70}>
              <div className="group h-full rounded-3xl border border-[#33202b]/[.07] bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-[#c2497c]/30 hover:shadow-xl hover:shadow-[#c2497c]/10">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#c2497c]/10 text-[#c2497c] transition-colors group-hover:bg-[#c2497c] group-hover:text-white">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#33202b]/55">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Galeria ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              src: SALON_PHOTOS.blowout,
              fallbackSrc: SALON_STOCK.petals,
              alt: "Lavatório e escova no salão",
            },
            {
              src: SALON_PHOTOS.manicure,
              fallbackSrc: SALON_STOCK.blush,
              alt: "Manicure em andamento",
            },
            {
              src: SALON_PHOTOS.makeup,
              fallbackSrc: SALON_STOCK.noite,
              alt: "Maquiagem profissional",
            },
          ].map((photo, index) => (
            <Reveal key={photo.alt} delay={index * 90}>
              <Parallax speed={index === 1 ? 0.05 : -0.04}>
                <div className="overflow-hidden rounded-3xl border border-[#33202b]/[.07] shadow-lg shadow-[#33202b]/[.06]">
                  <SmartImage
                    src={photo.src}
                    fallbackSrc={photo.fallbackSrc}
                    alt={photo.alt}
                    width={520}
                    height={420}
                    className="h-64 w-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                  />
                </div>
              </Parallax>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section
        id="como-funciona"
        className="scroll-mt-20 border-y border-[#33202b]/[.06] bg-white/60"
      >
        <div className="mx-auto max-w-7xl px-6 py-24">
          <Reveal className="text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              No ar{" "}
              <span className="font-serif text-[#c2497c] italic">hoje</span>,
              sem complicação.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((item, index) => (
              <Reveal key={item.step} delay={index * 110} className="relative">
                <span className="font-serif text-6xl font-semibold text-[#c2497c]/15 italic">
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#33202b]/55">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Temas ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            Sua marca
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Uma página tão{" "}
            <span className="font-serif text-[#c2497c] italic">linda</span>{" "}
            quanto o seu trabalho.
          </h2>
          <p className="mt-4 max-w-xl text-[#33202b]/55">
            Escolha um tema pronto ou monte o seu: cores, logo, fotos e fundos.
            Sua cliente agenda numa página que parece feita sob medida — porque
            é.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {themes.map((theme, index) => (
            <Reveal key={theme.name} delay={index * 90}>
              <div
                className="rounded-3xl border p-6 shadow-sm transition-transform hover:-translate-y-1"
                style={{
                  backgroundColor: theme.bg,
                  borderColor: `${theme.ink}14`,
                  color: theme.ink,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-9 place-items-center rounded-full text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Flower2 className="size-4" />
                  </span>
                  <span className="text-xs font-medium opacity-50">
                    {theme.name}
                  </span>
                </div>
                <p className="mt-6 font-serif text-xl italic">
                  Espaço {theme.name.split(" ")[0]}
                </p>
                <p className="mt-1 text-xs opacity-50">
                  Escolha o serviço e reserve seu horário
                </p>
                <div className="mt-5 flex gap-2">
                  <span
                    className="h-9 flex-1 rounded-full text-center text-xs leading-9 font-medium text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Agendar horário
                  </span>
                  <span
                    className="h-9 rounded-full border px-4 text-center text-xs leading-9"
                    style={{ borderColor: `${theme.ink}22` }}
                  >
                    WhatsApp
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Planos ===== */}
      <section
        id="planos"
        className="mx-auto max-w-5xl scroll-mt-20 px-6 pb-24"
      >
        <Reveal className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            7 dias grátis.{" "}
            <span className="font-serif text-[#c2497c] italic">
              Cancele quando quiser.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#33202b]/55">
            Teste tudo sem compromisso — a primeira cobrança só acontece depois
            do período de teste.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[2rem] border border-[#33202b]/[.08] bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold">Padrão</h3>
              <p className="mt-1 text-sm text-[#33202b]/50">
                Para colocar a agenda no ar hoje.
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-tight">
                {formatPriceBRL(catalog.starter.monthlyCents)}
                <span className="ml-1.5 align-middle text-sm font-normal text-[#33202b]/45">
                  /mês
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-[#c2497c]">
                7 dias grátis para testar
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#33202b]/60">
                {[
                  "Agenda online sem choque de horários",
                  "Página pública com QR Code",
                  "Clientes, serviços e equipe",
                  "Financeiro com receitas automáticas",
                  "Relatório financeiro em PDF",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#c2497c]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="mt-8 w-full rounded-full border-[#33202b]/15 hover:bg-[#33202b]/[.04]"
              >
                <Link href="/cadastro?plano=starter&vertical=salon">
                  Começar 7 dias grátis
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative h-full rounded-[2rem] border border-[#c2497c]/35 bg-gradient-to-b from-[#c2497c]/[.07] to-white p-8 shadow-2xl shadow-[#c2497c]/10">
              <Badge className="absolute -top-3 left-8 border-transparent bg-[#c2497c] text-white">
                <Sparkles className="size-3" /> Mais completo
              </Badge>
              <h3 className="text-lg font-semibold">Plus</h3>
              <p className="mt-1 text-sm text-[#33202b]/50">
                Para marcas que querem encantar.
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-tight">
                {formatPriceBRL(catalog.plus.monthlyCents)}
                <span className="ml-1.5 align-middle text-sm font-normal text-[#33202b]/45">
                  /mês
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-[#c2497c]">
                7 dias grátis para testar
              </p>
              <ul className="mt-7 space-y-3 text-sm text-[#33202b]/70">
                {[
                  "Tudo do Padrão",
                  "Página personalizada: logo, cores e fundos",
                  "Temas prontos e coleção de artes",
                  "Venda de produtos no agendamento",
                  "Estoque com baixa automática",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#c2497c]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="btn-shine mt-8 w-full rounded-full bg-[#c2497c] text-white hover:bg-[#a93a69]"
              >
                <Link href="/cadastro?plano=plus&vertical=salon">
                  Testar o Plus grátis <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Depoimentos ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            Quem usa, recomenda
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Feito para o dia a dia{" "}
            <span className="font-serif text-[#c2497c] italic">real</span> do
            salão.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal key={item.name} delay={index * 90}>
              <figure className="h-full rounded-3xl border border-[#33202b]/[.07] bg-white p-7 shadow-sm">
                <Quote className="size-5 text-[#c2497c]/50" />
                <blockquote className="mt-4 text-sm leading-7 text-[#33202b]/70">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-[#33202b]/45"> — {item.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#c2497c]/20 bg-gradient-to-b from-[#c2497c]/[.09] via-[#fdf6f3] to-[#fdf8f5] px-6 py-20 text-center shadow-2xl shadow-[#c2497c]/10">
            <div
              aria-hidden
              className="animate-orb pointer-events-none absolute -top-24 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-[#e78bb0]/25 blur-[110px]"
            />
            <div className="relative">
              <QrCode className="mx-auto size-7 text-[#c2497c]" />
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Um link seu, um QR Code na recepção — e a agenda{" "}
                <span className="font-serif text-[#c2497c] italic">
                  trabalha por você
                </span>
                .
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[#33202b]/55">
                7 dias grátis para testar tudo. Configure em minutos e receba
                reservas ainda hoje.
              </p>
              <Button
                asChild
                size="lg"
                className="btn-shine mt-9 h-13 rounded-full bg-[#c2497c] px-9 text-[15px] text-white shadow-xl shadow-[#c2497c]/25 hover:bg-[#a93a69]"
              >
                <Link href="/cadastro?vertical=salon">
                  Começar 7 dias grátis <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Lead: prefere que a gente chame? ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[.03] p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Prefere que a gente fale com você?
          </h2>
          <p className="mt-2 mb-6 text-sm text-stone-400">
            Deixe seu contato e mostramos o NexoBeleza funcionando na sua
            realidade. Sem compromisso.
          </p>
          <LeadCaptureForm vertical="salon" />
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#33202b]/[.07] px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#33202b]/50 sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-[#c2497c] text-white">
              <Flower2 className="size-3.5" />
            </span>
            NexoBeleza © {new Date().getFullYear()}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/login"
              className="transition-colors hover:text-[#33202b]"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro?vertical=salon"
              className="transition-colors hover:text-[#33202b]"
            >
              Criar conta
            </Link>
            <Link
              href="/studio-aurora"
              className="transition-colors hover:text-[#33202b]"
            >
              Demonstração
            </Link>
            <Link
              href="/privacidade"
              className="transition-colors hover:text-[#33202b]"
            >
              Privacidade
            </Link>
            <Link
              href="/termos"
              className="transition-colors hover:text-[#33202b]"
            >
              Termos
            </Link>
            <Link href="/" className="transition-colors hover:text-[#33202b]">
              Tem uma barbearia? Conheça o NexoBarber →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
