import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  ChevronDown,
  Clock3,
  MapPin,
  MessageCircle,
  Scissors,
  ShoppingBag,
  Sparkles,
  Timer,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { verticalCopy } from "@/lib/verticals";
import { tenantStyle, withAlpha } from "@/lib/colors";
import { whatsAppHref } from "@/lib/contact";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PublicHeader } from "@/components/public-site/public-header";
import { Reveal } from "@/components/public-site/reveal";
import { Parallax } from "@/components/public-site/parallax";
import { SmartImage } from "@/components/public-site/smart-image";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  return tenantPageMetadata(params);
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  const whatsapp = whatsAppHref(data.settings.whatsappNumber);
  const primary = data.settings.primaryColor;
  const copy = verticalCopy(data.barbershop.vertical);
  // Banner enviado pelo dono > foto real padrão da vertical; a arte SVG
  // correspondente fica de fallback.
  const heroImage = data.settings.bannerUrl || copy.heroPhoto;
  const ambienceImage = data.settings.bannerUrl || copy.ambiencePhoto;

  return (
    <main
      style={tenantStyle(data.settings)}
      className="min-h-screen overflow-x-clip bg-[var(--tenant-bg)] pb-24 text-[var(--tenant-secondary)] lg:pb-0"
    >
      <PublicHeader data={data} />

      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[88svh] items-center overflow-hidden">
        {/* Glows na cor do tenant */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="animate-orb absolute -top-32 -left-32 size-[30rem] rounded-full blur-[120px]"
            style={{ background: withAlpha(primary, 0.2) }}
          />
          <div
            className="animate-orb-late absolute -right-40 bottom-0 size-[34rem] rounded-full blur-[130px]"
            style={{ background: withAlpha(primary, 0.12) }}
          />
        </div>
        {/* Marca d'água editorial */}
        <span
          aria-hidden
          className="text-outline pointer-events-none absolute -bottom-6 left-1/2 hidden -translate-x-1/2 text-[11rem] leading-none font-bold tracking-tight whitespace-nowrap uppercase opacity-[.05] select-none lg:block"
        >
          {data.barbershop.name}
        </span>

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16">
          <div>
            <p className="motion-safe:animate-in motion-safe:fade-in flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase opacity-70 duration-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--tenant-primary)] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[var(--tenant-primary)]" />
              </span>
              Agenda aberta
            </p>
            <h1 className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance duration-700 sm:text-6xl lg:text-7xl">
              {data.settings.heroTitle}
            </h1>
            <p className="motion-safe:animate-in motion-safe:fade-in mt-6 max-w-md text-base leading-7 opacity-70 delay-150 duration-1000 sm:text-lg sm:leading-8">
              {data.settings.heroSubtitle}
            </p>

            <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 mt-9 flex flex-col gap-3 delay-200 duration-1000 sm:flex-row sm:items-center">
              <Link
                href={`/${tenant}/agendar`}
                className="btn-shine inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] px-8 text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-lg shadow-black/15 transition-all hover:opacity-90 active:scale-[.98]"
              >
                <CalendarCheck2 className="size-4.5" />
                Agendar horário
              </Link>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-current/15 px-7 text-[15px] font-medium transition-all hover:-translate-y-0.5 hover:bg-current/[.05]"
                >
                  <MessageCircle className="size-4.5" />
                  WhatsApp
                </a>
              ) : null}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-70">
              <span className="flex items-center gap-2">
                <Timer className="size-4 text-[var(--tenant-primary)]" />
                Reserva em menos de 1 minuto
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--tenant-primary)]" />
                Confirmação na hora
              </span>
            </div>

            {data.settings.address ? (
              <p className="mt-6 flex items-center gap-2 text-sm opacity-60">
                <MapPin className="size-4 shrink-0" />
                {data.settings.address}
              </p>
            ) : null}
          </div>

          {/* Imagem com ken-burns + chips flutuantes */}
          <Parallax speed={0.05} className="relative mt-4 lg:mt-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl shadow-black/25 sm:aspect-[16/10] lg:aspect-[4/5]">
              <SmartImage
                src={heroImage}
                fallbackSrc={copy.heroFallback}
                alt={`Ambiente da ${data.barbershop.name}`}
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="animate-kenburns object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute right-4 bottom-4 left-4 flex items-center gap-3 text-white">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
                  <CalendarCheck2 className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Horários em tempo real
                  </p>
                  <p className="truncate text-xs opacity-75">
                    Escolha o serviço, o profissional e o horário.
                  </p>
                </div>
              </div>
            </div>
            <div className="animate-float absolute -top-4 -right-3 hidden items-center gap-2 rounded-2xl border border-current/10 bg-[var(--tenant-bg)]/95 px-4 py-3 shadow-xl backdrop-blur sm:flex">
              <Scissors className="size-4 text-[var(--tenant-primary)]" />
              <span className="text-sm font-medium">
                {data.services.length}{" "}
                {data.services.length === 1 ? "serviço" : "serviços"}
              </span>
            </div>
            <div className="animate-float absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-2xl border border-current/10 bg-[var(--tenant-bg)]/95 px-4 py-3 shadow-xl backdrop-blur [animation-delay:1.2s] sm:flex">
              <UsersRound className="size-4 text-[var(--tenant-primary)]" />
              <span className="text-sm font-medium">
                {data.professionals.length}{" "}
                {data.professionals.length === 1
                  ? "profissional"
                  : "profissionais"}
              </span>
            </div>
          </Parallax>
        </div>

        <a
          href="#servicos"
          aria-label="Descer para os serviços"
          className="animate-scroll-cue absolute bottom-5 left-1/2 hidden -translate-x-1/2 opacity-60 transition-opacity hover:opacity-100 lg:block"
        >
          <ChevronDown className="size-6" />
        </a>
      </section>

      {/* ===== Serviços ===== */}
      <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-5">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-2xl shadow-black/20">
            <div className="p-6 sm:p-10">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--tenant-primary)] uppercase">
                {copy.servicesEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Serviços
              </h2>

              <ul className="mt-7 divide-y divide-current/10">
                {data.services.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/${tenant}/agendar?servico=${service.id}`}
                      className="group flex items-center gap-4 py-5 transition-all hover:pl-2"
                    >
                      {service.imageUrl ? (
                        <span className="relative hidden size-14 shrink-0 overflow-hidden rounded-2xl sm:block">
                          <Image
                            src={service.imageUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </span>
                      ) : (
                        <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-current/[.07] sm:grid">
                          <Scissors className="size-5 text-[var(--tenant-primary)]" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{service.name}</p>
                        {service.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-6 opacity-55">
                            {service.description}
                          </p>
                        ) : null}
                        <p className="mt-2 flex items-center gap-1.5 text-xs opacity-50">
                          <Clock3 className="size-3.5" />
                          {service.durationMinutes} min
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-[var(--tenant-primary)]">
                          {currency.format(Number(service.price))}
                        </span>
                        <span className="grid size-9 place-items-center rounded-full border border-current/15 transition-all duration-300 group-hover:translate-x-1 group-hover:border-[var(--tenant-primary)] group-hover:text-[var(--tenant-primary)]">
                          <ArrowRight className="size-4" />
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Profissionais ===== */}
      <section
        id="profissionais"
        className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:py-24"
      >
        <Reveal>
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-50">
            Quem cuida de você
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Profissionais
          </h2>
        </Reveal>

        <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {data.professionals.map((professional, index) => (
            <Reveal
              key={professional.id}
              delay={(index % 3) * 100}
              className="min-w-[78%] snap-start sm:min-w-0"
            >
              <div className="group h-full rounded-[1.75rem] border border-current/10 bg-current/[.03] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-current/20 hover:shadow-xl hover:shadow-black/10">
                <span
                  className="grid size-16 place-items-center overflow-hidden rounded-full text-xl font-semibold ring-2 ring-offset-2 ring-offset-[var(--tenant-bg)] transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: "var(--tenant-secondary)",
                    color: "var(--tenant-on-secondary)",
                    ["--tw-ring-color" as string]: withAlpha(primary, 0.6),
                  }}
                >
                  {professional.avatarUrl ? (
                    <Image
                      src={professional.avatarUrl}
                      alt={professional.name}
                      width={64}
                      height={64}
                      className="size-full object-cover"
                    />
                  ) : (
                    professional.name.slice(0, 1)
                  )}
                </span>
                <h3 className="mt-5 text-lg font-medium">
                  {professional.name}
                </h3>
                <p className="mt-1.5 text-sm leading-6 opacity-60">
                  {professional.bio ||
                    "Atendimento cuidadoso, do início ao acabamento."}
                </p>
                <Link
                  href={`/${tenant}/agendar`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--tenant-primary)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                >
                  Agendar com {professional.name.split(" ")[0]}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Produtos (Plus) ===== */}
      {data.products.length ? (
        <section
          id="produtos"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16 sm:pb-24"
        >
          <Reveal>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-50">
                  Leve para casa
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Produtos
                </h2>
              </div>
              <Link
                href={`/${tenant}/produtos`}
                className="hidden items-center gap-1.5 text-sm font-medium text-[var(--tenant-primary)] transition-transform hover:translate-x-0.5 sm:inline-flex"
              >
                Ver todos <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
          <div className="-mx-5 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
            {data.products.slice(0, 6).map((product, index) => (
              <Reveal
                key={product.id}
                delay={(index % 4) * 80}
                className="min-w-[62%] snap-start sm:min-w-[240px]"
              >
                <div className="group h-full overflow-hidden rounded-[1.5rem] border border-current/10 bg-current/[.03] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
                  <div className="relative aspect-[4/3] overflow-hidden bg-current/[.05]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(min-width: 640px) 240px, 62vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="grid size-full place-items-center">
                        <ShoppingBag className="size-8 opacity-30" />
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[var(--tenant-primary)]">
                      {currency.format(Number(product.price))}
                    </p>
                    <p className="mt-1.5 text-xs opacity-50">
                      Adicione ao reservar seu horário.
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== Faixa de ambiente (parallax) ===== */}
      <section className="relative h-[42vh] min-h-72 overflow-hidden">
        <Parallax
          speed={0.14}
          className="absolute inset-x-0 -top-[30%] -bottom-[30%]"
        >
          <div className="relative h-full w-full">
            <SmartImage
              src={ambienceImage}
              fallbackSrc={copy.ambienceFallback}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Parallax>
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center px-5 text-center text-white">
          <Reveal>
            <span
              className="mx-auto block h-0.5 w-12 rounded-full"
              style={{ background: primary }}
            />
            <p className="mt-6 max-w-xl text-2xl font-medium tracking-tight text-balance sm:text-3xl">
              {copy.ambienceQuote}
            </p>
            <p className="mt-3 text-sm tracking-[0.18em] uppercase opacity-70">
              {data.barbershop.name}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--tenant-primary)] px-6 py-14 text-center text-[var(--tenant-on-primary)] shadow-2xl shadow-black/20 sm:py-20">
            <div
              aria-hidden
              className="animate-gradient-pan absolute inset-0 bg-gradient-to-br from-white/[.12] via-transparent to-black/[.1]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Seu horário te espera.
              </h2>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 opacity-80 sm:text-base">
                Sem fila e sem telefone: reserve agora e chegue na hora certa.
              </p>
              <Link
                href={`/${tenant}/agendar`}
                className="btn-shine mt-9 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] px-9 text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-lg shadow-black/20 transition-all hover:scale-[1.02] active:scale-[.98]"
              >
                Escolher meu horário
                <ArrowUpRight className="size-4.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <PublicFooter data={data} />

      {/* CTA fixo no polegar (só celular): agendar sempre a um toque. */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)] lg:hidden">
        <Link
          href={`/${tenant}/agendar`}
          className="btn-shine flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-2xl shadow-black/30 transition-transform active:scale-[.98]"
        >
          <CalendarCheck2 className="size-4.5" />
          Agendar horário
        </Link>
      </div>
    </main>
  );
}
