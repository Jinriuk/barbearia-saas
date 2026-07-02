import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBarbershop } from "@/modules/barbershops/queries";
import { BookingForm } from "@/components/public-site/booking-form";
import { PublicHeader } from "@/components/public-site/public-header";

export const dynamic = "force-dynamic";

export default async function BookingPage({
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
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link
          href={`/${tenant}`}
          className="mb-7 inline-flex items-center gap-2 text-sm opacity-60"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">
          Reserve seu horário
        </h1>
        <p className="mt-3 text-sm opacity-60">
          Disponibilidade em tempo real. O horário só é garantido após a
          confirmação.
        </p>
        <div className="mt-9">
          <BookingForm
            tenant={tenant}
            services={data.services}
            professionals={data.professionals}
          />
        </div>
      </div>
    </main>
  );
}
