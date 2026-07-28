import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Clock3, Scissors } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { tenantStyle } from "@/lib/colors";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PublicHeader } from "@/components/public-site/public-header";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  return tenantPageMetadata(params, "Serviços");
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Catálogo completo de serviços (Fase 4). Esta rota existia como um arquivo
 * de 8 linhas que redirecionava para a âncora da home — link que devolvia o
 * visitante exatamente para onde ele já estava.
 */
export default async function TenantServicesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  return (
    <main
      style={tenantStyle(data.settings)}
      className="min-h-screen overflow-x-clip bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} />
      <div className="mx-auto max-w-4xl px-5 pt-8 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-all hover:-translate-x-0.5 hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Serviços
        </h1>
        <p className="mt-2 text-sm leading-6 opacity-60">
          Escolha o serviço e siga direto para o horário.
        </p>

        {data.services.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-current/10 bg-current/[.03] px-4 py-6 text-sm opacity-70">
            Nenhum serviço publicado no momento.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-current/10 border-y border-current/10">
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
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-current/[.06] sm:grid">
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
        )}
      </div>
      <PublicFooter data={data} />
    </main>
  );
}
