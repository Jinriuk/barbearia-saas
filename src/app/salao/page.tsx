import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  CalendarCheck,
  Check,
  Flower2,
  Heart,
  QrCode,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { SALON_PHOTOS, SALON_STOCK } from "@/lib/assets";
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
} from "@/components/platform/system-screens";
import { Reveal } from "@/components/public-site/reveal";
import { Parallax } from "@/components/public-site/parallax";
import { SmartImage } from "@/components/public-site/smart-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * O título dizia "o sistema completo", exatamente o que a apresentação
 * estratégica desaconselha: é o que todo concorrente diz e não cria posição.
 * O nicho no lugar dele é a posição (mesma correção da landing de barbearia).
 */
export const metadata: Metadata = {
  title: "NexoBeleza — gestão para salão de 2 a 8 profissionais",
  description:
    "Para a dona que ainda atende na cadeira: agenda que a cliente marca sozinha, as clientes que sumiram, e o lucro do mês depois das comissões. 7 dias grátis, sem cartão.",
};

/** A dor vem antes do produto — a página abria com um carrossel de recursos. */
const pains = [
  {
    title: "O WhatsApp não para, e você está com a mão na cabeça da cliente",
    body: "Cada horário custa três mensagens. Quando você atende, a conversa esfria — e ela vai marcar em outro lugar.",
  },
  {
    title: "Cliente sumiu e você só percebeu meses depois",
    body: "Ninguém avisa que parou de vir. Ela simplesmente não volta, e a cadeira que era dela fica vazia numa quinta à tarde.",
  },
  {
    title: "Entrou dinheiro, mas você não sabe se sobrou",
    body: "O caixa fechou bem. Depois vem produto, aluguel e a comissão da equipe — e o que era lucro vira dúvida.",
  },
  {
    title: "O fechamento da comissão é no papel",
    body: "Todo fim de mês a mesma conta manual, e uma profissional que não consegue conferir a própria produção.",
  },
];

/** Os 5 Gs como arquitetura: cada elo puxa o seguinte. */
const gs = [
  {
    key: "G1",
    icon: CalendarCheck,
    title: "A cliente marca sozinha",
    body: "Sua página com link e QR Code, mostrando só os horários realmente livres de cada profissional. Ela escolhe, remarca e cancela sem falar com ninguém.",
    link: "O horário entra na agenda…",
  },
  {
    key: "G2",
    icon: Heart,
    title: "…e vira histórico da cliente",
    body: "O sistema aprende de quanto em quanto tempo cada uma costuma voltar e avisa quem passou do prazo. É a lista de quem chamar hoje.",
    link: "O atendimento concluído…",
  },
  {
    key: "G3",
    icon: Banknote,
    title: "…vira dinheiro no financeiro",
    body: "Vendido, recebido e a receber são três números separados. O lucro do mês desconta despesa e comissão — faturamento é o que entra, lucro é o que fica.",
    link: "O que foi produzido…",
  },
  {
    key: "G4",
    icon: UsersRound,
    title: "…fecha a comissão da equipe",
    body: "Cada profissional vê a própria produção e a própria comissão, com vale e adiantamento descontados. Fechamento sem papel e sem discussão.",
    link: "E na recepção…",
  },
  {
    key: "G5",
    icon: Sparkles,
    title: "…o produto sai com baixa no estoque",
    body: "Venda de balcão com carrinho, estoque que não fica negativo e aviso quando um produto está acabando.",
    link: null,
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

// Ver o comentário equivalente em src/app/page.tsx: os depoimentos nominais
// eram ficção apresentada como cliente real e saíram na Fase 0.
const dailyWins = [
  {
    title: "A cliente marca sozinha",
    body: "Link e QR Code próprios, com a agenda de cada profissional e os horários realmente livres. Sem ida e volta no WhatsApp.",
  },
  {
    title: "O financeiro se preenche",
    body: "Concluir o atendimento lança a venda. Vendido, recebido e a receber são números separados — não uma soma só.",
  },
  {
    title: "Você vê quem sumiu",
    body: "O sistema calcula de quanto em quanto tempo cada cliente costuma voltar e mostra quem passou do prazo.",
  },
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
              Salão de 2 a 8 profissionais de beleza
            </Badge>
            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 text-5xl font-semibold tracking-[-0.045em] text-balance duration-700 sm:text-7xl">
              Você atende o dia inteiro e, no fim do mês, ainda não sabe{" "}
              <span className="animate-gradient-pan bg-gradient-to-r from-[#c2497c] via-[#d9832f] to-[#c2497c] bg-clip-text font-serif text-transparent italic">
                quanto sobrou
              </span>
              .
            </h1>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-7 max-w-2xl text-lg leading-8 text-[#33202b]/60 delay-150 duration-1000">
              <strong className="font-medium text-[#33202b]">
                Seu salão cheio, sua agenda leve.
              </strong>{" "}
              Da agenda ao lucro: agenda sem choque de horários, financeiro que
              se preenche sozinho, clientes, equipe e estoque — e uma página de
              agendamento linda, com a sua marca. Feito para quem ainda atende
              na cadeira e não tem tempo de virar administradora.
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
              <p className="mt-1 text-[10px] tracking-wide text-[#33202b]/40 uppercase">
                Exemplo ilustrativo
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

      {/* ===== A dor ===== */}
      <section
        id="a-dor"
        className="border-y border-[#33202b]/[.07] bg-white/60 py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
              A semana de quem toca um salão
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Se alguma destas frases é a sua, o problema não é falta de
              trabalho.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {pains.map((pain, index) => (
              <Reveal key={pain.title} delay={(index % 2) * 90}>
                <div className="h-full rounded-3xl border border-[#33202b]/[.08] bg-white p-7 shadow-sm">
                  <h3 className="text-base font-medium">{pain.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-[#33202b]/60">
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
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            Como funciona
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Cinco engrenagens, uma puxando a outra.
          </h2>
          <p className="mt-4 max-w-2xl text-[#33202b]/60">
            Não é uma lista de recursos soltos: o horário que a cliente marca
            vira histórico, o histórico vira dinheiro, o dinheiro fecha a
            comissão. É por isso que preencher uma coisa não significa preencher
            tudo de novo.
          </p>
        </Reveal>

        <div className="mt-14 space-y-4">
          {gs.map((item, index) => (
            <Reveal key={item.key} delay={index * 70}>
              <div className="flex flex-col gap-5 rounded-3xl border border-[#33202b]/[.08] bg-white p-7 shadow-sm sm:flex-row sm:items-start sm:gap-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#c2497c]/10 text-[#c2497c]">
                  <item.icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-xs tracking-widest text-[#c2497c]/70">
                    {item.key}
                  </p>
                  <h3 className="mt-1 text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#33202b]/60">
                    {item.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Telas do sistema ===== */}
      <section className="border-y border-[#33202b]/[.07] bg-white/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
              Por dentro
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              É isto que você vai ver quando entrar.
            </h2>
            <p className="mt-4 max-w-2xl text-[#33202b]/60">
              Sem menu de 40 itens, sem relatório que ninguém entende. As telas
              que resolvem o dia:
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <AgendaScreen
                tone="light"
                columns={["Você", "Bia", "Carla"]}
                grid={[
                  ["09:00", ["Escova · Ana", null, "Manicure · Rita"]],
                  ["10:00", [null, "Coloração · Paula", null]],
                  ["11:00", ["Corte · Duda", "Almoço", null]],
                  ["12:00", ["Almoço", "Almoço", "Escova · Lu"]],
                ]}
              />
            </Reveal>
            <Reveal delay={110}>
              <ClientsScreen
                tone="light"
                names={["Marcela A.", "Renata P.", "Tainá M.", "Vitória C."]}
              />
            </Reveal>
          </div>
          <DemoDataNote tone="light" className="mt-5" />
        </div>
      </section>

      {/* ===== O diferencial: quem sumiu (G2) ===== */}
      <section
        id="quem-sumiu"
        className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24"
      >
        <div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
              O que quase ninguém tem
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Quantas clientes sumiram sem você perceber?
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#33202b]/65">
              <p>
                Cliente insatisfeita reclama. Cliente que cansou só some — e
                some em silêncio, uma cadeira vazia por vez, até você olhar o
                mês e achar que &ldquo;está fraco&rdquo;.
              </p>
              <p>
                O sistema calcula de quanto em quanto tempo{" "}
                <strong className="font-medium text-[#33202b]">
                  cada cliente sua
                </strong>{" "}
                costuma voltar. Quando alguém passa do próprio prazo, ela
                aparece numa lista com o telefone do lado e a mensagem pronta
                para o WhatsApp.
              </p>
              <p>
                É a parte mais bem construída do produto, e é a que devolve
                dinheiro que já era seu: cliente antiga voltando custa uma
                mensagem, não um anúncio.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="btn-shine mt-8 h-13 rounded-full bg-[#c2497c] px-8 text-[15px] text-white hover:bg-[#a93a69]"
            >
              <Link href="/cadastro?vertical=salon">
                Ver quem sumiu da minha base <ArrowRight />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={120}>
            <ClientsScreen
              tone="light"
              names={["Marcela A.", "Renata P.", "Tainá M.", "Vitória C."]}
            />
            <DemoDataNote tone="light" className="mt-3" />
          </Reveal>
        </div>
      </section>

      {/* ===== Iscas: a conta e o diagnóstico ===== */}
      <section className="border-y border-[#33202b]/[.07] bg-white/60 py-24">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 lg:grid-cols-2">
          <Reveal>
            <ProfitCalculator
              tone="light"
              planCents={catalog.starter.monthlyCents}
            />
          </Reveal>
          <Reveal delay={120}>
            <Diagnostic5G tone="light" vertical="salon" />
          </Reveal>
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
        <PricingPlans
          tone="light"
          vertical="salon"
          plans={[
            {
              key: "starter",
              name: "Padrão",
              pitch: "Para colocar a agenda no ar hoje.",
              monthlyCents: catalog.starter.monthlyCents,
              yearlyCents: catalog.starter.yearlyCents,
              features: [
                "Agenda online sem choque de horários",
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
              pitch: "Para marcas que querem encantar.",
              monthlyCents: catalog.plus.monthlyCents,
              yearlyCents: catalog.plus.yearlyCents,
              highlighted: true,
              features: [
                "Tudo do Padrão",
                "Página personalizada: logo, cores e fundos",
                "Temas prontos e coleção de artes",
                "Venda de produtos no agendamento",
                "Estoque com baixa automática",
              ],
            },
          ]}
        />
      </section>

      {/* ===== O dia a dia no salão ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-[#c2497c] uppercase">
            No dia a dia
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Feito para o dia a dia{" "}
            <span className="font-serif text-[#c2497c] italic">real</span> do
            salão.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {dailyWins.map((item, index) => (
            <Reveal key={item.title} delay={index * 90}>
              <div className="h-full rounded-3xl border border-[#33202b]/[.07] bg-white p-7 shadow-sm">
                <Check className="size-5 text-[#c2497c]/50" />
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#33202b]/70">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Lead — antes do CTA final (Fase 5 §5.5) =====
          Estava na última seção da página, depois do fechamento: quem
          desistia no meio nunca chegava nele, e o pedido era justamente
          capturar quem NÃO compra na hora. */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {/* Card e texto claros sobre fundo claro deixavam o bloco quase
            invisível (item 5.9 do plano). */}
        <div className="mx-auto max-w-xl rounded-[2rem] border border-[#33202b]/[.07] bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ainda em dúvida? A gente te mostra.
          </h2>
          <p className="mt-2 mb-6 text-sm text-[#33202b]/60">
            Deixe seu contato e mostramos o NexoBeleza funcionando na sua
            realidade — seus serviços, sua equipe, seus horários. Sem
            compromisso.
          </p>
          <LeadCaptureForm vertical="salon" />
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
