import Link from "next/link";
import { ArrowLeft, CalendarCheck2 } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicBarbershop,
  tenantPageMetadata,
} from "@/modules/barbershops/queries";
import { tenantStyle } from "@/lib/colors";
import { PublicFooter } from "@/components/public-site/public-footer";
import { PublicHeader } from "@/components/public-site/public-header";
import { ProductCard } from "@/components/public-site/product-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  return tenantPageMetadata(params, "Produtos");
}

/**
 * Catálogo completo de produtos (Fase 4). A home mostra no máximo 6 e o
 * "Ver todos" caía aqui — que redirecionava de volta para os mesmos 6.
 * Quem tem 7 produtos nunca via o sétimo.
 */
export default async function TenantProductsPage({
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
      <div className="mx-auto max-w-5xl px-5 pt-8 pb-16">
        <Link
          href={`/${tenant}`}
          className="inline-flex items-center gap-1.5 text-sm opacity-60 transition-all hover:-translate-x-0.5 hover:opacity-100"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          Produtos
        </h1>
        <p className="mt-2 text-sm leading-6 opacity-60">
          Você adiciona os produtos ao reservar o seu horário e leva no dia.
        </p>

        {data.products.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-current/10 bg-current/[.03] px-4 py-6 text-sm opacity-70">
            Nenhum produto disponível no momento.
          </p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                price={product.price}
                imageUrl={product.imageUrl}
                stock={product.stock}
              />
            ))}
          </div>
        )}

        <Link
          href={`/${tenant}/agendar`}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] px-7 text-[15px] font-medium text-[var(--tenant-on-secondary)] transition-opacity hover:opacity-90"
        >
          <CalendarCheck2 className="size-4.5" />
          Agendar horário
        </Link>
      </div>
      <PublicFooter data={data} />
    </main>
  );
}
