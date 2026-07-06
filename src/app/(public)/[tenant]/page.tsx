import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock3,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicBarbershop } from "@/modules/barbershops/queries";
import { STOCK_PHOTOS } from "@/lib/assets";
import { PublicHeader } from "@/components/public-site/public-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  const style = {
    "--tenant-primary": data.settings.primaryColor,
    "--tenant-secondary": data.settings.secondaryColor,
    "--tenant-bg": data.settings.backgroundColor,
  } as React.CSSProperties;

  return (
    <main
      style={style}
      className="min-h-screen bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} />
      <section className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 overflow-hidden px-5 py-16 lg:grid-cols-[1fr_.8fr]">
        <div className="relative z-10 max-w-3xl">
          <p className="mb-5 text-xs font-semibold tracking-[0.22em] uppercase opacity-55">
            Agenda aberta · {data.barbershop.name}
          </p>
          <h1 className="text-5xl leading-[.95] font-semibold tracking-[-0.055em] text-balance sm:text-7xl">
            {data.settings.heroTitle}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 opacity-65">
            {data.settings.heroSubtitle}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-9 bg-[var(--tenant-secondary)] text-[var(--tenant-bg)] hover:opacity-90"
          >
            <Link href={`/${tenant}/agendar`}>
              Escolher meu horário <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="relative hidden aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-[var(--tenant-secondary)] lg:block">
          <Image
            src={data.settings.bannerUrl || STOCK_PHOTOS.barberChair}
            alt={`Ambiente da ${data.barbershop.name}`}
            fill
            sizes="(min-width: 1024px) 40vw, 0px"
            className="object-cover"
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, ${data.settings.secondaryColor}cc 0%, transparent 45%, ${data.settings.primaryColor}55 100%)`,
            }}
          />
          <div className="absolute right-6 bottom-6 left-6 rounded-2xl bg-black/45 p-4 text-white backdrop-blur-sm">
            <p className="flex items-center gap-2 text-xs tracking-[.18em] uppercase opacity-80">
              <Sparkles className="size-3.5" /> Reserva online
            </p>
            <p className="mt-1 text-sm leading-6">
              Escolha o serviço, o profissional e o horário — sem fila e sem
              telefone.
            </p>
          </div>
        </div>
      </section>

      <section
        id="servicos"
        className="bg-[var(--tenant-secondary)] px-5 py-20 text-[var(--tenant-bg)]"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[.2em] text-[var(--tenant-primary)] uppercase">
                Menu da casa
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Serviços
              </h2>
            </div>
            <Link href={`/${tenant}/servicos`} className="text-sm opacity-60">
              Ver todos
            </Link>
          </div>
          <div className="grid gap-px overflow-hidden rounded-3xl bg-white/10 md:grid-cols-2 lg:grid-cols-3">
            {data.services.slice(0, 6).map((service) => (
              <div
                key={service.id}
                className="bg-[var(--tenant-secondary)] p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium">{service.name}</h3>
                  <span className="font-mono text-sm text-[var(--tenant-primary)]">
                    R$ {Number(service.price).toFixed(2)}
                  </span>
                </div>
                <p className="mt-3 min-h-12 text-sm leading-6 opacity-55">
                  {service.description ||
                    "Cuidado e acabamento no tempo certo."}
                </p>
                <p className="mt-6 flex items-center gap-2 text-xs opacity-50">
                  <Clock3 className="size-3.5" /> {service.durationMinutes}{" "}
                  minutos
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="profissionais" className="mx-auto max-w-7xl px-5 py-20">
        <p className="text-xs tracking-[.2em] uppercase opacity-50">
          Quem cuida
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Profissionais</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.professionals.map((professional) => (
            <div
              key={professional.id}
              className="rounded-3xl border border-black/10 p-6"
            >
              <div className="grid size-12 place-items-center rounded-full bg-[var(--tenant-secondary)] font-semibold text-[var(--tenant-bg)]">
                {professional.name.slice(0, 1)}
              </div>
              <h3 className="mt-5 font-medium">{professional.name}</h3>
              <p className="mt-2 text-sm leading-6 opacity-60">
                {professional.bio ||
                  "Atendimento cuidadoso, do início ao acabamento."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/10 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm opacity-65 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {data.barbershop.name}
          </span>
          <div className="flex gap-5">
            {data.settings.address ? (
              <span className="flex gap-2">
                <MapPin className="size-4" />
                {data.settings.address}
              </span>
            ) : null}
            {data.settings.instagramUrl ? (
              <a
                href={data.settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  );
}
