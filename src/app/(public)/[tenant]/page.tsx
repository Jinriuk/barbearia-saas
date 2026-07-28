import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Clock3,
  MapPin,
  MessageCircle,
  Scissors,
  Sparkles,
  Timer,
} from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { verticalCopy } from "@/lib/verticals";
import { tenantStyle } from "@/lib/colors";
import { instagramHandle, whatsAppHref } from "@/lib/contact";
import { openingHoursList } from "@/lib/opening-hours";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PublicHeader } from "@/components/public-site/public-header";
import { Reveal } from "@/components/public-site/reveal";
import { SmartImage } from "@/components/public-site/smart-image";
import { StickyBookCta } from "@/components/public-site/sticky-book-cta";
import { ProductCard } from "@/components/public-site/product-card";

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

/**
 * Página do cliente final (§7.10). Ordem obrigatória das seções: capa,
 * serviços, profissionais, produtos, endereço/horário/contato e chamada
 * final.
 *
 * Fase 4: a capa deixou de ocupar quase a tela inteira (era 88svh com orbs
 * animados, ken-burns e dois chips flutuantes) e passou a ser o que o guia
 * pede — foto de fundo com camada escura, nome do negócio, benefício e um
 * botão. A faixa de ambiente, que era uma sétima seção fora da ordem,
 * virou a foto da seção de endereço e horário.
 */
export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  const whatsapp = whatsAppHref(data.settings.whatsappNumber);
  const instagram = instagramHandle(data.settings.instagramUrl);
  const copy = verticalCopy(data.barbershop.vertical);
  // Banner enviado pelo dono > foto real padrão da vertical; a arte SVG
  // correspondente fica de fallback.
  const heroImage = data.settings.bannerUrl || copy.heroPhoto;
  const ambienceImage = data.settings.bannerUrl || copy.ambiencePhoto;
  const autoConfirm = data.settings.bookingConfirmationMode === "auto";
  const hours = openingHoursList(data.settings.openingHours);
  const visibleProducts = data.products.slice(0, 6);

  return (
    <main
      style={tenantStyle(data.settings)}
      className="min-h-screen overflow-x-clip bg-[var(--tenant-bg)] pb-24 text-[var(--tenant-secondary)] lg:pb-0"
    >
      <PublicHeader data={data} />

      {/* ===== 1. Capa ===== */}
      <section id="capa" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <SmartImage
            src={heroImage}
            fallbackSrc={copy.heroFallback}
            alt={`Ambiente da ${data.barbershop.name}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {/* §7.10: camada escura entre 55% e 70% sobre a foto de fundo. */}
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-14 text-white sm:py-20">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-80">
            {data.barbershop.name}
          </p>
          <h1 className="mt-4 line-clamp-3 max-w-2xl text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
            {data.settings.heroTitle}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 opacity-85">
            {data.settings.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${tenant}/agendar`}
              className="btn-shine inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[var(--tenant-primary)] px-8 text-[15px] font-semibold text-[var(--tenant-on-primary)] shadow-lg shadow-black/25 transition-all hover:opacity-90 active:scale-[.98]"
            >
              <CalendarCheck2 className="size-4.5" />
              Agendar horário
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-[15px] font-medium transition-colors hover:bg-white/10"
              >
                <MessageCircle className="size-4.5" />
                WhatsApp
              </a>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-85">
            <span className="flex items-center gap-2">
              <Timer className="size-4" />
              Reserva em menos de 1 minuto
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="size-4" />
              {autoConfirm ? "Confirmação imediata" : copy.confirmationChip}
            </span>
          </div>
        </div>
      </section>

      {/* ===== 2. Serviços ===== */}
      <section
        id="servicos"
        className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14 sm:py-20"
      >
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
                        {/* §7.10: ícone importante sempre com rótulo. */}
                        <span className="inline-flex h-11 items-center gap-1.5 rounded-full border border-current/15 px-4 text-xs font-medium transition-colors group-hover:border-[var(--tenant-primary)] group-hover:text-[var(--tenant-primary)]">
                          <span className="hidden sm:inline">
                            Escolher este serviço
                          </span>
                          <span className="sm:hidden">Escolher</span>
                          <ArrowRight className="size-3.5" />
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

      {/* ===== 3. Profissionais ===== */}
      <section
        id="profissionais"
        className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-14 sm:pb-20"
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
              <div className="flex h-full flex-col rounded-[1.75rem] border border-current/10 bg-current/[.03] p-6 transition-all duration-300 hover:border-current/20 hover:shadow-xl hover:shadow-black/10">
                <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-[var(--tenant-secondary)] text-xl font-semibold text-[var(--tenant-on-secondary)]">
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
                <p className="mt-1.5 flex-1 text-sm leading-6 opacity-60">
                  {professional.bio ||
                    "Atendimento cuidadoso, do início ao acabamento."}
                </p>
                {/* Antes este botão só existia no hover — ou seja, nunca no
                    celular. Agora é permanente e já leva o profissional. */}
                <Link
                  href={`/${tenant}/agendar?profissional=${professional.id}`}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-current/15 px-5 text-sm font-medium transition-colors hover:border-[var(--tenant-primary)] hover:text-[var(--tenant-primary)]"
                >
                  Agendar com {professional.name.split(" ")[0]}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== 4. Produtos (Plus) ===== */}
      {data.products.length ? (
        <section
          id="produtos"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-14 sm:pb-20"
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
              {/* "Ver todos" só quando existe mais do que já está na tela. */}
              {data.products.length > visibleProducts.length ? (
                <Link
                  href={`/${tenant}/produtos`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--tenant-primary)] transition-transform hover:translate-x-0.5"
                >
                  Ver todos <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </Reveal>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product, index) => (
              <Reveal key={product.id} delay={(index % 3) * 80}>
                <ProductCard
                  name={product.name}
                  price={product.price}
                  imageUrl={product.imageUrl}
                  stock={product.stock}
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== 5. Endereço, horário e contato ===== */}
      <section
        id="onde"
        className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-14 sm:pb-20"
      >
        <Reveal>
          <div className="grid overflow-hidden rounded-[2rem] border border-current/10 bg-current/[.03] lg:grid-cols-2">
            <div className="p-6 sm:p-10">
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-50">
                Onde e quando
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Nos encontre
              </h2>

              {data.settings.address ? (
                <p className="mt-6 flex items-start gap-2.5 text-sm leading-6">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--tenant-primary)]" />
                  {data.settings.address}
                </p>
              ) : null}

              {hours.length ? (
                <div className="mt-6">
                  <p className="text-xs font-semibold tracking-wide uppercase opacity-45">
                    Horário de funcionamento
                  </p>
                  <dl className="mt-3 divide-y divide-current/10 border-y border-current/10">
                    {hours.map((entry) => (
                      <div
                        key={entry.key}
                        className="flex items-center justify-between gap-4 py-2.5 text-sm"
                      >
                        <dt className="opacity-60">{entry.label}</dt>
                        <dd className="font-medium">{entry.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {whatsapp ? (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-current/15 px-5 text-sm font-medium transition-colors hover:bg-current/[.05]"
                  >
                    <MessageCircle className="size-4" />
                    {data.settings.whatsappNumber}
                  </a>
                ) : null}
                {data.settings.instagramUrl ? (
                  <a
                    href={data.settings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-current/15 px-5 text-sm font-medium transition-colors hover:bg-current/[.05]"
                  >
                    {instagram ?? "Instagram"}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="relative order-first min-h-56 lg:order-last">
              <SmartImage
                src={ambienceImage}
                fallbackSrc={copy.ambienceFallback}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== 6. Chamada final ===== */}
      <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--tenant-primary)] px-6 py-14 text-center text-[var(--tenant-on-primary)] shadow-2xl shadow-black/20 sm:py-20">
            <div className="relative">
              <h2 className="mx-auto max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
                Seu horário te espera.
              </h2>
              {/* A promessa muda com o modo real de confirmação (§7.11): no
                  modo manual esta página não promete horário na hora. */}
              <p className="mx-auto mt-4 max-w-sm text-sm leading-6 opacity-80 sm:text-base">
                {autoConfirm
                  ? "Sem fila e sem telefone: reserve agora e chegue na hora certa."
                  : copy.ctaNoteManual}
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

      <StickyBookCta tenant={tenant} watchId="capa" />
    </main>
  );
}
