import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { isPlus } from "@/lib/plans";
import { tenantStyle } from "@/lib/colors";
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
      className="min-h-screen bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} hideCta />
      <div className="mx-auto max-w-2xl px-5 pt-7 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-opacity hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          Reserve seu horário
        </h1>
        <p className="mt-2 text-sm leading-6 opacity-60">
          Disponibilidade em tempo real — leva menos de um minuto.
        </p>
        <div className="mt-8">
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
          />
        </div>
      </div>
    </main>
  );
}
