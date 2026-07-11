import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck,
  Check,
  Palette,
  QrCode,
  Quote,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { REAL_PHOTOS, STOCK_PHOTOS } from "@/lib/assets";
import { PLANS, formatPriceBRL } from "@/lib/billing";
import { Reveal } from "@/components/public-site/reveal";
import { Parallax } from "@/components/public-site/parallax";
import { SmartImage } from "@/components/public-site/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "NexoBarber — o sistema completo para a sua barbearia",
  description:
    "Agenda online, financeiro automático, clientes, estoque e uma página de agendamento com a sua marca. 7 dias grátis, sem cartão.",
};

const features = [
  {
    icon: CalendarCheck,
    title: "Agenda sem conflito",
    description:
      "Horários duplicados são bloqueados no banco de dados, mesmo com dois clientes reservando ao mesmo tempo.",
  },
  {
    icon: Smartphone,
    title: "Reserva pelo celular",
    description:
      "Seu cliente escolhe serviço, profissional e horário na sua página — sem baixar aplicativo.",
  },
  {
    icon: Banknote,
    title: "Financeiro integrado",
    description:
      "Atendimento concluído e venda confirmada viram receita na hora: dia, semana e mês sempre em dia.",
  },
  {
    icon: Palette,
    title: "Sua marca, sua página",
    description:
      "Logo, cores, fundos e textos personalizados. Temas prontos e coleção de artes exclusivas no plano Plus.",
  },
  {
    icon: UsersRound,
    title: "Equipe com papéis",
    description:
      "Gerente, secretária e profissional: cada pessoa vê apenas o que precisa para trabalhar.",
  },
  {
    icon: ShieldCheck,
    title: "Isolamento real",
    description:
      "Cada barbearia em seu próprio espaço, com segurança aplicada linha a linha no banco de dados.",
  },
];

const steps = [
  {
    step: "01",
    title: "Crie sua conta",
    description: "Cadastro gratuito, nome da barbearia e endereço da página.",
  },
  {
    step: "02",
    title: "Monte o catálogo",
    description: "Serviços, preços, profissionais e horários de atendimento.",
  },
  {
    step: "03",
    title: "Divulgue o link",
    description:
      "QR Code no balcão e link no Instagram. As reservas caem direto na sua agenda.",
  },
];

const themes = [
  {
    name: "Dourado clássico",
    bg: "#faf8f4",
    ink: "#171717",
    accent: "#b8893e",
  },
  {
    name: "Meia-noite",
    bg: "#101318",
    ink: "#f4f1ea",
    accent: "#d9a441",
  },
  {
    name: "Esmeralda",
    bg: "#f2f7f4",
    ink: "#10231c",
    accent: "#2f9e77",
  },
];

const testimonials = [
  {
    quote:
      "Antes era WhatsApp o dia inteiro. Agora o cliente marca sozinho e a cadeira não fica vazia.",
    name: "Rafael",
    role: "Dono de barbearia, 2 cadeiras",
  },
  {
    quote:
      "O financeiro se preenche sozinho quando concluo o atendimento. Fim do caderninho.",
    name: "Diego",
    role: "Barbeiro e gestor",
  },
  {
    quote:
      "Coloquei o QR Code no espelho. Metade dos clientes já remarca antes de sair da cadeira.",
    name: "Marcos",
    role: "Barbearia de bairro, 4 profissionais",
  },
];

const marqueeItems = [
  "Agenda online",
  "Financeiro integrado",
  "Página personalizável",
  "QR Code no balcão",
  "Estoque e produtos",
  "Equipe com papéis",
  "Relatório em PDF",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#0c0b09] text-stone-50">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#0c0b09]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-full bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/25">
              <Scissors className="size-4" />
            </span>
            NexoBarber
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-stone-400 md:flex">
            <a href="#recursos" className="transition-colors hover:text-stone-100">
              Recursos
            </a>
            <a
              href="#como-funciona"
              className="transition-colors hover:text-stone-100"
            >
              Como funciona
            </a>
            <a href="#planos" className="transition-colors hover:text-stone-100">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-stone-200 hover:text-stone-950"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="btn-shine bg-amber-500 text-stone-950 hover:bg-amber-400"
            >
              <Link href="/cadastro">Testar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative">
        {/* Glows decorativos */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="animate-orb absolute -top-40 -left-40 size-[34rem] rounded-full bg-amber-500/[.14] blur-[130px]" />
          <div className="animate-orb-late absolute top-24 -right-48 size-[38rem] rounded-full bg-indigo-500/[.1] blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[.35]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              maskImage:
                "radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 75%)",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28 lg:pb-36">
          <div className="max-w-3xl">
            <Badge className="motion-safe:animate-in motion-safe:fade-in mb-7 border-amber-500/30 bg-amber-500/10 text-amber-300 duration-700">
              <Sparkles className="size-3" />
              Plataforma completa para barbearias
            </Badge>
            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 text-5xl font-semibold tracking-[-0.045em] text-balance duration-700 sm:text-7xl">
              A barbearia que trabalha{" "}
              <span className="animate-gradient-pan bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 bg-clip-text text-transparent">
                no seu ritmo
              </span>
              .
            </h1>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-7 max-w-2xl text-lg leading-8 text-stone-400 delay-150 duration-1000">
              O sistema que cuida do seu negócio inteiro: agenda sem
              conflito, financeiro que se preenche sozinho, clientes, equipe,
              estoque e uma página de agendamento deslumbrante com a sua
              marca. Sem planilha, sem caderninho.
            </p>
            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mt-10 flex flex-col gap-3 delay-200 duration-1000 sm:flex-row sm:flex-wrap">
              <Button
                asChild
                size="lg"
                className="btn-shine h-13 w-full rounded-full bg-amber-500 px-8 text-[15px] text-stone-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400 sm:w-auto"
              >
                <Link href="/cadastro">
                  Começar 7 dias grátis <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 w-full rounded-full border-white/15 bg-white/5 px-7 text-[15px] hover:bg-white/10 sm:w-auto"
              >
                <Link href="/aurora">Ver página de demonstração</Link>
              </Button>
            </div>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-4 text-sm text-stone-500 delay-300 duration-1000">
              A partir de {formatPriceBRL(PLANS.starter.priceCents)}/mês · 7
              dias grátis · cancele quando quiser
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500">
              {[
                "Grátis para começar",
                "Sem app para o cliente",
                "Pronto em minutos",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-amber-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup flutuante */}
          <div className="relative hidden sm:block">
            <Parallax speed={0.06}>
              <div className="animate-float-slow relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/60">
                <SmartImage
                  src={REAL_PHOTOS.barberCut}
                  fallbackSrc={STOCK_PHOTOS.barberCut}
                  alt="Barbeiro finalizando um corte na barbearia"
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="animate-kenburns object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b09] via-transparent to-transparent" />
              </div>
            </Parallax>
            <div className="animate-float absolute right-0 -bottom-10 w-[86%] rounded-[2rem] border border-white/10 bg-[#171612]/95 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-500">Hoje na agenda</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    12 horários
                  </p>
                </div>
                <CalendarCheck className="size-6 text-amber-400" />
              </div>
              <div className="mt-5 space-y-2.5">
                {[
                  ["09:00", "Lucas Martins", "Corte assinatura"],
                  ["10:15", "João Alves", "Corte + barba"],
                  ["11:30", "André Lima", "Barba clássica"],
                ].map(([time, client, service]) => (
                  <div
                    key={time}
                    className="flex items-center gap-4 rounded-2xl bg-white/[0.04] p-3.5 transition-colors hover:bg-white/[0.07]"
                  >
                    <span className="font-mono text-sm text-amber-300">
                      {time}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{client}</p>
                      <p className="text-xs text-stone-500">{service}</p>
                    </div>
                    <span className="ml-auto size-2 rounded-full bg-emerald-400" />
                  </div>
                ))}
              </div>
            </div>
            <div className="animate-float absolute -top-6 -left-8 rounded-2xl border border-white/10 bg-[#171612]/95 px-5 py-4 shadow-xl backdrop-blur [animation-delay:1.4s]">
              <p className="text-xs text-stone-500">Recebido no mês</p>
              <p className="mt-0.5 font-mono text-xl font-semibold text-emerald-400">
                R$ 8.940
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Marquee ===== */}
      <div className="relative border-y border-white/[.06] bg-white/[.02] py-4">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="flex shrink-0 items-center gap-3 text-sm font-medium tracking-wide text-stone-400 uppercase"
              >
                <Scissors className="size-3.5 text-amber-500/70" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Recursos ===== */}
      <section id="recursos" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Recursos
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que o balcão precisa, nada do que atrapalha.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 90}>
              <div className="group h-full rounded-3xl border border-white/10 bg-white/[.02] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:bg-white/[.04] hover:shadow-xl hover:shadow-amber-500/[.06]">
                <span className="grid size-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 transition-transform duration-300 group-hover:scale-110">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  {feature.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section
        id="como-funciona"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 pb-24"
      >
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Do cadastro à primeira reserva em minutos.
          </h2>
        </Reveal>
        <div className="relative mt-12 grid gap-4 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute top-14 right-[16%] left-[16%] hidden border-t border-dashed border-white/15 md:block"
          />
          {steps.map((item, index) => (
            <Reveal key={item.step} delay={index * 120}>
              <div className="relative h-full rounded-3xl border border-white/10 bg-[#12110e] p-7">
                <span className="font-mono text-5xl font-semibold text-amber-500/25">
                  {item.step}
                </span>
                <h3 className="mt-4 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Galeria de fotos ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              src: REAL_PHOTOS.interior,
              fallback: STOCK_PHOTOS.barberChair,
              alt: "Interior clássico de barbearia com cadeiras e espelhos",
              caption: "O clima da sua casa",
            },
            {
              src: REAL_PHOTOS.beardTrim,
              fallback: STOCK_PHOTOS.beardTrim,
              alt: "Barba sendo aparada com precisão",
              caption: "Precisão no detalhe",
            },
            {
              src: REAL_PHOTOS.clippers,
              fallback: STOCK_PHOTOS.barberCut,
              alt: "Corte com máquina em fundo escuro",
              caption: "Rotina sem fila",
            },
          ].map((photo, index) => (
            <Reveal key={photo.caption} delay={index * 110}>
              <figure className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 sm:aspect-[3/4]">
                <SmartImage
                  src={photo.src}
                  fallbackSrc={photo.fallback}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 640px) 30vw, 90vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <figcaption className="absolute bottom-4 left-5 text-sm font-medium text-white/90">
                  {photo.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Showcase white-label ===== */}
      <section className="relative overflow-hidden border-y border-white/[.06] bg-white/[.02] py-24">
        <div
          aria-hidden
          className="animate-orb pointer-events-none absolute top-1/2 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[.06] blur-[140px]"
        />
        <div className="relative mx-auto max-w-7xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
              Página do cliente
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              A página de agendamento com a cara da sua barbearia.
            </h2>
            <p className="mt-4 text-stone-400">
              Escolha um tema pronto ou monte o seu: logo, cores, fundos de uma
              coleção exclusiva e textos. O preview atualiza em tempo real — e o
              resultado impressiona no celular do cliente.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {themes.map((theme, index) => (
              <Reveal key={theme.name} delay={index * 120}>
                <div
                  className="group overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40 transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[.4deg] hover:shadow-amber-500/10"
                  style={{ background: theme.bg, color: theme.ink }}
                >
                  <div
                    className="flex items-center justify-between border-b px-5 py-3.5"
                    style={{ borderColor: `${theme.ink}14` }}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="grid size-6 place-items-center rounded-full"
                        style={{ background: theme.accent, color: theme.bg }}
                      >
                        <Scissors className="size-3" />
                      </span>
                      Sua barbearia
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: theme.ink, color: theme.bg }}
                    >
                      Agendar
                    </span>
                  </div>
                  <div className="px-5 pt-6 pb-7">
                    <p
                      className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase"
                      style={{ color: theme.accent }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: theme.accent }}
                      />
                      Agenda aberta
                    </p>
                    <p className="mt-3 text-2xl leading-tight font-semibold tracking-tight">
                      Seu estilo,
                      <br />
                      no seu tempo.
                    </p>
                    <p className="mt-2 text-xs opacity-60">
                      Escolha o serviço e reserve seu horário.
                    </p>
                    <div className="mt-5 flex items-center gap-2">
                      <span
                        className="rounded-full px-4 py-2 text-xs font-medium transition-transform duration-300 group-hover:scale-105"
                        style={{ background: theme.ink, color: theme.bg }}
                      >
                        Escolher horário
                      </span>
                      <span
                        className="rounded-full border px-4 py-2 text-xs font-medium"
                        style={{ borderColor: `${theme.ink}22` }}
                      >
                        WhatsApp
                      </span>
                    </div>
                  </div>
                  <div
                    className="border-t px-5 py-3 text-center text-[11px] font-medium"
                    style={{
                      borderColor: `${theme.ink}14`,
                      color: theme.accent,
                    }}
                  >
                    Tema {theme.name}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Planos ===== */}
      <section id="planos" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24">
        <Reveal className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            7 dias grátis. Cancele quando quiser.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-400">
            Teste tudo sem compromisso — a primeira cobrança só acontece
            depois do período de teste.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-[2rem] border border-white/10 bg-white/[.02] p-8">
              <h3 className="text-lg font-semibold">Padrão</h3>
              <p className="mt-1 text-sm text-stone-500">
                Para colocar a agenda no ar hoje.
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-tight">
                {formatPriceBRL(PLANS.starter.priceCents)}
                <span className="ml-1.5 align-middle text-sm font-normal text-stone-500">
                  /mês
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-amber-400">
                7 dias grátis para testar
              </p>
              <ul className="mt-7 space-y-3 text-sm text-stone-400">
                {[
                  "Agenda online sem conflito",
                  "Página pública com QR Code",
                  "Clientes, serviços e equipe",
                  "Financeiro com receitas automáticas",
                  "Relatório financeiro em PDF",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant="outline"
                className="mt-8 w-full rounded-full border-white/15 bg-white/5 hover:bg-white/10"
              >
                <Link href="/cadastro?plano=starter">
                  Começar 7 dias grátis
                </Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative h-full rounded-[2rem] border border-amber-500/40 bg-gradient-to-b from-amber-500/[.1] to-transparent p-8 shadow-2xl shadow-amber-500/10">
              <Badge className="absolute -top-3 left-8 border-transparent bg-amber-500 text-stone-950">
                <Sparkles className="size-3" /> Mais completo
              </Badge>
              <h3 className="text-lg font-semibold">Plus</h3>
              <p className="mt-1 text-sm text-stone-500">
                Para marcas que querem impressionar.
              </p>
              <p className="mt-5 text-4xl font-semibold tracking-tight">
                {formatPriceBRL(PLANS.plus.priceCents)}
                <span className="ml-1.5 align-middle text-sm font-normal text-stone-500">
                  /mês
                </span>
              </p>
              <p className="mt-1 text-xs font-medium text-amber-400">
                7 dias grátis para testar
              </p>
              <ul className="mt-7 space-y-3 text-sm text-stone-300">
                {[
                  "Tudo do Padrão",
                  "White label completo: logo, cores e fundos",
                  "Coleção de artes e temas prontos",
                  "Upsell de produtos no agendamento",
                  "Reservas de produtos com baixa de estoque",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="btn-shine mt-8 w-full rounded-full bg-amber-500 text-stone-950 hover:bg-amber-400"
              >
                <Link href="/cadastro?plano=plus">
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
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Quem usa, recomenda
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Feito para o dia a dia real do balcão.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal key={item.name} delay={index * 100}>
              <figure className="h-full rounded-3xl border border-white/10 bg-white/[.02] p-7">
                <Quote className="size-5 text-amber-500/60" />
                <blockquote className="mt-4 text-[15px] leading-7 text-stone-300">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-medium text-stone-200">
                    {item.name}
                  </span>
                  <span className="text-stone-500"> · {item.role}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/25 px-8 py-16 text-center sm:px-16">
            <div
              aria-hidden
              className="animate-gradient-pan absolute inset-0 bg-gradient-to-br from-amber-500/[.16] via-transparent to-amber-500/[.08]"
            />
            <div
              aria-hidden
              className="animate-orb pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-amber-500/15 blur-[100px]"
            />
            <div className="relative">
              <QrCode className="mx-auto size-7 text-amber-400" />
              <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Um link seu, um QR Code no balcão, e a agenda trabalha por você.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-stone-400">
                7 dias grátis para testar tudo. Configure em minutos e receba
                reservas ainda hoje.
              </p>
              <Button
                asChild
                size="lg"
                className="btn-shine mt-9 h-13 rounded-full bg-amber-500 px-9 text-[15px] text-stone-950 shadow-xl shadow-amber-500/25 hover:bg-amber-400"
              >
                <Link href="/cadastro">
                  Começar 7 dias grátis <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-stone-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-amber-500 text-stone-950">
              <Scissors className="size-3.5" />
            </span>
            NexoBarber © {new Date().getFullYear()}
          </span>
          <div className="flex gap-6">
            <Link href="/login" className="transition-colors hover:text-stone-300">
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="transition-colors hover:text-stone-300"
            >
              Criar conta
            </Link>
            <Link href="/aurora" className="transition-colors hover:text-stone-300">
              Demonstração
            </Link>
            <Link
              href="/privacidade"
              className="transition-colors hover:text-stone-300"
            >
              Privacidade
            </Link>
            <Link
              href="/termos"
              className="transition-colors hover:text-stone-300"
            >
              Termos
            </Link>
            <Link href="/salao" className="transition-colors hover:text-stone-300">
              É salão de beleza? Conheça o NexoBeleza →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
