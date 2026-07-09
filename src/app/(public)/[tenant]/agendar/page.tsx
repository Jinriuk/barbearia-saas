import { ArrowLeft, CalendarCheck2, Sparkles, Timer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { isPlus } from "@/lib/plans";
import { tenantStyle, withAlpha } from "@/lib/colors";
import { whatsAppHref } from "@/lib/contact";
import { getDateInTz } from "@/lib/dates";
import { BookingForm } from "@/components/public-site/booking-form";
import { PublicHeader } from "@/components/public-site/public-header";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  return tenantPageMetadata(params, "Agendar");
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ servico?: string }>;
}) {
  const [{ tenant }, { servico }] = await Promise.all([params, searchParams]);
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  const initialServiceId = data.services.some((item) => item.id === servico)
    ? servico
    : undefined;

  return (
    <main
      style={tenantStyle(data.settings)}
      className="relative min-h-screen overflow-x-clip bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
        <div
          className="animate-orb mx-auto h-72 w-[42rem] max-w-full rounded-full blur-[120px]"
          style={{ background: withAlpha(data.settings.primaryColor, 0.16) }}
        />
      </div>

      <PublicHeader data={data} hideCta />

      <div className="relative mx-auto max-w-2xl px-5 pt-8 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-all hover:-translate-x-0.5 hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 mt-6 duration-700">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[var(--tenant-primary)] uppercase">
            <CalendarCheck2 className="size-3.5" />
            {data.barbershop.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reserve seu horário
          </h1>
          <p className="mt-2 text-sm leading-6 opacity-60">
            Disponibilidade em tempo real — leva menos de um minuto.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-current/10 bg-current/[.04] px-3 py-1.5">
              <Timer className="size-3.5 text-[var(--tenant-primary)]" />
              Menos de 1 minuto
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-current/10 bg-current/[.04] px-3 py-1.5">
              <Sparkles className="size-3.5 text-[var(--tenant-primary)]" />
              Confirmação na hora
            </span>
          </div>
        </div>

        <div className="motion-safe:animate-in motion-safe:fade-in mt-8 delay-150 duration-1000">
          <BookingForm
            tenant={tenant}
            timezone={data.barbershop.timezone}
            todayInTz={getDateInTz(data.barbershop.timezone)}
            services={data.services}
            professionals={data.professionals}
            products={data.products}
            isPlus={isPlus(data.barbershop.plan)}
            initialServiceId={initialServiceId}
            whatsappHref={whatsAppHref(data.settings.whatsappNumber)}
            vertical={data.barbershop.vertical}
          />
        </div>
      </div>
    </main>
  );
}
