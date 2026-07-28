import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  return tenantPageMetadata(params, "Profissionais");
}

/**
 * Equipe completa (Fase 4). Cada pessoa leva ao agendamento já selecionada —
 * antes esta rota só redirecionava para a âncora da home.
 */
export default async function TenantProfessionalsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();

  const serviceName = new Map(
    data.services.map((service) => [service.id, service.name]),
  );

  return (
    <main
      style={tenantStyle(data.settings)}
      className="min-h-screen overflow-x-clip bg-[var(--tenant-bg)] text-[var(--tenant-secondary)]"
    >
      <PublicHeader data={data} />
      <div className="mx-auto max-w-5xl px-5 pt-8 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-all hover:-translate-x-0.5 hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Profissionais
        </h1>
        <p className="mt-2 text-sm leading-6 opacity-60">
          Escolha com quem você quer ser atendido.
        </p>

        {data.professionals.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-current/10 bg-current/[.03] px-4 py-6 text-sm opacity-70">
            Nenhum profissional publicado no momento.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.professionals.map((professional) => {
              const services = professional.serviceIds
                .map((id) => serviceName.get(id))
                .filter(Boolean)
                .slice(0, 4);
              return (
                <div
                  key={professional.id}
                  className="flex h-full flex-col rounded-[1.75rem] border border-current/10 bg-current/[.03] p-6"
                >
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
                  <h2 className="mt-5 text-lg font-medium">
                    {professional.name}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 opacity-60">
                    {professional.bio ||
                      "Atendimento cuidadoso, do início ao acabamento."}
                  </p>
                  {services.length ? (
                    <p className="mt-3 flex-1 text-xs leading-5 opacity-50">
                      {services.join(" · ")}
                    </p>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <Link
                    href={`/${tenant}/agendar?profissional=${professional.id}`}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-current/15 px-5 text-sm font-medium transition-colors hover:border-[var(--tenant-primary)] hover:text-[var(--tenant-primary)]"
                  >
                    Agendar com {professional.name.split(" ")[0]}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <PublicFooter data={data} />
    </main>
  );
}
