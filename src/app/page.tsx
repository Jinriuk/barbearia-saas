import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Package,
  PiggyBank,
  QrCode,
  Scissors,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";
import { REAL_PHOTOS, STOCK_PHOTOS } from "@/lib/assets";
import { formatPriceBRL } from "@/lib/billing";
import { loadPlanCatalog } from "@/lib/billing/catalog";
import { Diagnostic5G } from "@/components/platform/diagnostic-5g";
import { LeadCaptureForm } from "@/components/platform/lead-capture-form";
import { PricingPlans } from "@/components/platform/pricing-plans";
import { ProfitCalculator } from "@/components/platform/profit-calculator";
import {
  AgendaScreen,
  ClientsScreen,
  DemoDataNote,
  FinanceScreen,
} from "@/components/platform/system-screens";
import { Reveal } from "@/components/public-site/reveal";
import { Parallax } from "@/components/public-site/parallax";
import { SmartImage } from "@/components/public-site/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * O título dizia "o sistema completo para a sua barbearia" — exatamente o que
 * a apresentação estratégica desaconselha, porque "completo" é o que todo
 * concorrente diz e não cria posição nenhuma. O nicho no lugar dele é a
 * posição: 2 a 8 profissionais, dono que ainda atende (Fase 5 §5.6).
 */
export const metadata: Metadata = {
  title: "NexoBarber — gestão para barbearia de 2 a 8 cadeiras",
  description:
    "Para o dono que ainda atende na cadeira: agenda que o cliente marca sozinho, os clientes que sumiram, e o lucro do mês depois das comissões. 7 dias grátis, sem cartão.",
};

/**
 * A dor vem antes do produto (Fase 5 §5.6).
 *
 * A página abria com um carrossel de recursos — violação literal da regra "não
 * abrir com uma lista longa de recursos" da apresentação estratégica. O
 * carrossel saiu. O que abre agora é o dia do dono que ainda atende: ele não
 * chega aqui procurando "agenda online", chega porque alguma dessas quatro
 * frases é a semana dele.
 */
const pains = [
  {
    title: "O WhatsApp não para, e você está com a máquina na mão",
    body: "Cada horário custa três mensagens. Quando você atende, a conversa esfria — e o cliente vai marcar em outro lugar.",
  },
  {
    title: "Cliente sumiu e você só percebeu meses depois",
    body: "Ninguém avisa que parou de vir. Ele simplesmente não volta, e a cadeira que era dele fica vazia numa quinta à tarde.",
  },
  {
    title: "Entrou dinheiro, mas você não sabe se sobrou",
    body: "O caixa fechou bem. Depois vem produto, aluguel e a comissão da equipe — e o que era lucro vira dúvida.",
  },
  {
    title: "O fechamento da comissão é no papel",
    body: "Todo fim de mês a mesma conta manual, e um profissional que não consegue conferir a própria produção.",
  },
];

/**
 * Os 5 Gs como arquitetura da página (apresentação estratégica).
 *
 * Não é a mesma coisa que a grade de recursos que estava aqui: cada G é um
 * elo de um fluxo que se conecta ao seguinte — a agenda alimenta o cadastro do
 * cliente, o atendimento vira dinheiro, o dinheiro vira comissão. É essa
 * ligação que o produto tem e a página não contava.
 */
const gs = [
  {
    key: "G1",
    icon: CalendarCheck,
    title: "O cliente marca sozinho",
    body: "Sua página com link e QR Code, mostrando só os horários realmente livres de cada profissional. Ele escolhe, remarca e cancela sem falar com ninguém.",
    link: "O horário entra na agenda…",
  },
  {
    key: "G2",
    icon: UserRoundSearch,
    title: "…e vira histórico de cliente",
    body: "O sistema aprende de quanto em quanto tempo cada um costuma voltar e avisa quem passou do prazo. É a lista de quem chamar hoje.",
    link: "O atendimento concluído…",
  },
  {
    key: "G3",
    icon: PiggyBank,
    title: "…vira dinheiro no financeiro",
    body: "Vendido, recebido e a receber são três números separados. O lucro do mês desconta despesa e comissão — faturamento é o que entra, lucro é o que fica.",
    link: "O que foi produzido…",
  },
  {
    key: "G4",
    icon: UsersRound,
    title: "…fecha a comissão da equipe",
    body: "Cada profissional vê a própria produção e a própria comissão, com vale e adiantamento descontados. Fechamento sem papel e sem discussão.",
    link: "E no balcão…",
  },
  {
    key: "G5",
    icon: Package,
    title: "…o produto sai com baixa no estoque",
    body: "Venda de balcão com carrinho, estoque que não fica negativo e aviso quando um produto está acabando.",
    link: null,
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
  { name: "Meia-noite", bg: "#101318", ink: "#f4f1ea", accent: "#d9a441" },
  { name: "Esmeralda", bg: "#f2f7f4", ink: "#10231c", accent: "#2f9e77" },
];

export const revalidate = 3600;

export default async function HomePage() {
  // Preço da fonte de verdade (catálogo no banco — Fase 2B); a página segue
  // estática com revalidação horária.
  const catalog = await loadPlanCatalog();

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
            <a
              href="#os-5gs"
              className="transition-colors hover:text-stone-100"
            >
              Como funciona
            </a>
            <a
              href="#quem-sumiu"
              className="transition-colors hover:text-stone-100"
            >
              Quem sumiu
            </a>
            <a
              href="#planos"
              className="transition-colors hover:text-stone-100"
            >
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

      {/* ===== Hero — abre pela dor, com o nicho explícito ===== */}
      <section className="relative">
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

        <div className="relative mx-auto grid max-w-7xl gap-16 px-6 pt-20 pb-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <Badge className="motion-safe:animate-in motion-safe:fade-in mb-7 border-amber-500/30 bg-amber-500/10 text-amber-300 duration-700">
              <Scissors className="size-3" />
              Barbearia de 2 a 8 profissionais
            </Badge>
            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 text-4xl font-semibold tracking-[-0.045em] text-balance duration-700 sm:text-6xl">
              Você atende o dia inteiro e, no fim do mês, ainda não sabe{" "}
              <span className="animate-gradient-pan bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 bg-clip-text text-transparent">
                quanto sobrou
              </span>
              .
            </h1>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-7 max-w-2xl text-lg leading-8 text-stone-400 delay-150 duration-1000">
              <strong className="font-medium text-stone-200">
                Gestão simples para barbearias que querem crescer.
              </strong>{" "}
              Da agenda ao lucro: organize agenda, equipe e financeiro, saiba
              quais clientes precisam voltar e tome decisões com clareza. Feito
              para quem ainda atende na cadeira e não tem tempo de virar
              administrador.
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
              A partir de {formatPriceBRL(catalog.starter.monthlyCents)}/mês · 7
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

          {/* A tela que responde a pergunta do título, já no primeiro olhar. */}
          <div className="relative hidden sm:block">
            <Parallax speed={0.05}>
              <FinanceScreen />
            </Parallax>
            <DemoDataNote className="mt-3 text-center" />
          </div>
        </div>
      </section>

      {/* ===== A dor ===== */}
      <section
        id="a-dor"
        className="border-y border-white/[.06] bg-white/[.02] py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
              A semana de quem toca uma barbearia
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Se alguma destas frases é a sua, o problema não é falta de
              trabalho.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {pains.map((pain, index) => (
              <Reveal key={pain.title} delay={(index % 2) * 90}>
                <div className="h-full rounded-3xl border border-white/10 bg-[#12110e] p-7">
                  <h3 className="text-base font-medium text-stone-100">
                    {pain.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-7 text-stone-400">
                    {pain.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Os 5 Gs — o fluxo conectado ===== */}
      <section
        id="os-5gs"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
      >
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Cinco engrenagens, uma puxando a outra.
          </h2>
          <p className="mt-4 max-w-2xl text-stone-400">
            Não é uma lista de recursos soltos: o horário que o cliente marca
            vira histórico, o histórico vira dinheiro, o dinheiro fecha a
            comissão. É por isso que preencher uma coisa não significa preencher
            tudo de novo.
          </p>
        </Reveal>

        <div className="mt-14 space-y-4">
          {gs.map((item, index) => (
            <Reveal key={item.key} delay={index * 70}>
              <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[.02] p-7 sm:flex-row sm:items-start sm:gap-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <item.icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs tracking-widest text-amber-400/70">
                    {item.key}
                  </p>
                  <h3 className="mt-1 text-lg font-medium text-stone-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-stone-400">
                    {item.body}
                  </p>
                </div>
              </div>
              {item.link ? (
                <p
                  aria-hidden
                  className="py-2 pl-13 text-sm text-stone-600 sm:pl-[3.75rem]"
                >
                  ↓ {item.link}
                </p>
              ) : null}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Telas do sistema ===== */}
      <section className="border-y border-white/[.06] bg-white/[.02] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
              Por dentro
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              É isto que você vai ver quando entrar.
            </h2>
            <p className="mt-4 max-w-2xl text-stone-400">
              Sem menu de 40 itens, sem relatório que ninguém entende. As telas
              que resolvem o dia:
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <AgendaScreen />
            </Reveal>
            <Reveal delay={110}>
              <ClientsScreen />
            </Reveal>
          </div>
          <DemoDataNote className="mt-5" />
        </div>
      </section>

      {/* ===== O diferencial: quem sumiu (G2) ===== */}
      <section
        id="quem-sumiu"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
      >
        <div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
              O que quase ninguém tem
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Quantos clientes sumiram sem você perceber?
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-stone-400">
              <p>
                Cliente insatisfeito reclama. Cliente que cansou só some — e
                some em silêncio, uma cadeira vazia por vez, até você olhar o
                mês e achar que &ldquo;está fraco&rdquo;.
              </p>
              <p>
                O sistema calcula de quanto em quanto tempo{" "}
                <strong className="font-medium text-stone-200">
                  cada cliente seu
                </strong>{" "}
                costuma voltar. Quando alguém passa do próprio prazo, ele
                aparece numa lista com o telefone do lado e a mensagem pronta
                para o WhatsApp.
              </p>
              <p>
                É a parte mais bem construída do produto, e é a que devolve
                dinheiro que já era seu: cliente antigo voltando custa uma
                mensagem, não um anúncio.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="btn-shine mt-8 h-13 rounded-full bg-amber-500 px-8 text-[15px] text-stone-950 hover:bg-amber-400"
            >
              <Link href="/cadastro">
                Ver quem sumiu da minha base <ArrowRight />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={120}>
            <ClientsScreen />
            <DemoDataNote className="mt-3" />
          </Reveal>
        </div>
      </section>

      {/* ===== Iscas: a conta e o diagnóstico ===== */}
      <section className="border-y border-white/[.06] bg-white/[.02] py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-2">
          <Reveal>
            <ProfitCalculator planCents={catalog.starter.monthlyCents} />
          </Reveal>
          <Reveal delay={120}>
            <Diagnostic5G />
          </Reveal>
        </div>
      </section>

      {/* ===== Fotos ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
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

      {/* ===== Página do cliente ===== */}
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

      {/* ===== Como começa ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Como começa
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

      {/* ===== Planos ===== */}
      <section
        id="planos"
        className="mx-auto max-w-5xl scroll-mt-20 px-6 py-24"
      >
        <Reveal className="text-center">
          <p className="text-xs font-semibold tracking-[0.22em] text-amber-400 uppercase">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            7 dias grátis. Cancele quando quiser.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-stone-400">
            Teste tudo sem compromisso — a primeira cobrança só acontece depois
            do período de teste.
          </p>
        </Reveal>
        <PricingPlans
          plans={[
            {
              key: "starter",
              name: "Padrão",
              pitch: "Para colocar a agenda no ar hoje.",
              monthlyCents: catalog.starter.monthlyCents,
              yearlyCents: catalog.starter.yearlyCents,
              features: [
                "Agenda online sem conflito",
                "Página pública com QR Code",
                "Clientes, serviços e equipe",
                "Financeiro com receitas automáticas",
                "Relatório financeiro em PDF",
                "Produtos e controle de estoque",
              ],
            },
            {
              key: "plus",
              name: "Plus",
              pitch: "Para marcas que querem impressionar.",
              monthlyCents: catalog.plus.monthlyCents,
              yearlyCents: catalog.plus.yearlyCents,
              highlighted: true,
              features: [
                "Tudo do Padrão",
                "Página personalizada: logo, cores, fundos e textos",
                "Coleção de artes e temas prontos",
                "Venda de produtos no agendamento do cliente",
                "Reservas de produtos com baixa de estoque",
              ],
            },
          ]}
        />
      </section>

      {/* ===== Lead — antes do fim da página (§5.5) ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Reveal>
          <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[.03] p-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Ainda em dúvida? A gente te mostra.
            </h2>
            <p className="mt-2 mb-6 text-sm text-stone-400">
              Deixe seu contato e mostramos o NexoBarber rodando com a sua
              realidade — seus serviços, sua equipe, seus horários. Sem
              compromisso e sem cartão.
            </p>
            <LeadCaptureForm vertical="barber" />
          </div>
        </Reveal>
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
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/login"
              className="transition-colors hover:text-stone-300"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="transition-colors hover:text-stone-300"
            >
              Criar conta
            </Link>
            <Link
              href="/aurora"
              className="transition-colors hover:text-stone-300"
            >
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
            <Link
              href="/salao"
              className="transition-colors hover:text-stone-300"
            >
              É salão de beleza? Conheça o NexoBeleza →
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
