import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Clock3,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicBarbershop } from "@/modules/barbershops/queries";
import { STOCK_PHOTOS } from "@/lib/assets";
import { tenantStyle } from "@/lib/colors";
import { whatsAppHref } from "@/lib/contact";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PublicHeader } from "@/components/public-site/public-header";

export const dynamic = "force-dynamic";

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

  return (
    <main
      style={tenantStyle(data.settings)}
      className="min-h-screen bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-14 sm:pt-16 lg:grid lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:gap-14 lg:pb-20">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase opacity-60">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--tenant-primary)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--tenant-primary)]" />
            </span>
            Agenda aberta
          </p>
          <h1 className="mt-5 text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
            {data.settings.heroTitle}
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 opacity-70 sm:text-lg sm:leading-8">
            {data.settings.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/${tenant}/agendar`}
              className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] px-8 text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-lg shadow-black/10 transition-all hover:opacity-90 active:scale-[.98]"
            >
              <CalendarCheck2 className="size-4.5" />
              Agendar horário
            </Link>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-black/15 px-7 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
              >
                <MessageCircle className="size-4.5" />
                WhatsApp
              </a>
            ) : null}
          </div>

          {data.settings.address ? (
            <p className="mt-7 flex items-center gap-2 text-sm opacity-60">
              <MapPin className="size-4 shrink-0" />
              {data.settings.address}
            </p>
          ) : null}
        </div>

        <div className="relative mt-10 aspect-[4/3] overflow-hidden rounded-3xl bg-[var(--tenant-secondary)] sm:aspect-[16/9] lg:mt-0 lg:aspect-[4/5]">
          <Image
            src={data.settings.bannerUrl || STOCK_PHOTOS.barberChair}
            alt={`Ambiente da ${data.barbershop.name}`}
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute right-4 bottom-4 left-4 flex items-center gap-3 text-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-sm">
              <CalendarCheck2 className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Reserva em menos de 1 minuto
              </p>
              <p className="truncate text-xs opacity-75">
                Escolha o serviço, o profissional e o horário.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="mx-auto max-w-6xl px-5">
        <div className="overflow-hidden rounded-3xl bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]">
          <div className="p-6 sm:p-10">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--tenant-primary)] uppercase">
              Menu da casa
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Serviços
            </h2>

            <ul className="mt-7 divide-y divide-current/10">
              {data.services.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/${tenant}/agendar?servico=${service.id}`}
                    className="group flex items-center gap-4 py-5 transition-opacity hover:opacity-80"
                  >
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
                      <span className="grid size-9 place-items-center rounded-full border border-current/15 transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Profissionais */}
      <section
        id="profissionais"
        className="mx-auto max-w-6xl px-5 py-14 sm:py-20"
      >
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-50">
          Quem cuida de você
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Profissionais
        </h2>

        <div className="-mx-5 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {data.professionals.map((professional) => (
            <div
              key={professional.id}
              className="min-w-[78%] snap-start rounded-3xl border border-black/10 bg-white/40 p-6 sm:min-w-0"
            >
              <span className="grid size-14 place-items-center overflow-hidden rounded-full bg-[var(--tenant-secondary)] text-lg font-semibold text-[var(--tenant-on-secondary)]">
                {professional.avatarUrl ? (
                  <Image
                    src={professional.avatarUrl}
                    alt={professional.name}
                    width={56}
                    height={56}
                    className="size-full object-cover"
                  />
                ) : (
                  professional.name.slice(0, 1)
                )}
              </span>
              <h3 className="mt-5 text-lg font-medium">{professional.name}</h3>
              <p className="mt-1.5 text-sm leading-6 opacity-60">
                {professional.bio ||
                  "Atendimento cuidadoso, do início ao acabamento."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-14 sm:pb-20">
        <div className="rounded-3xl bg-[var(--tenant-primary)] px-6 py-12 text-center text-[var(--tenant-on-primary)] sm:py-16">
          <h2 className="mx-auto max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Seu horário te espera.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 opacity-80 sm:text-base">
            Sem fila e sem telefone: reserve agora e chegue na hora certa.
          </p>
          <Link
            href={`/${tenant}/agendar`}
            className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] px-8 text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-lg shadow-black/15 transition-all hover:opacity-90 active:scale-[.98]"
          >
            Escolher meu horário
            <ArrowUpRight className="size-4.5" />
          </Link>
        </div>
      </section>

      <PublicFooter data={data} />
    </main>
  );
}
