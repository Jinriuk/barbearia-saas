import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicBarbershop } from "@/types/domain";

// cache() deduplica a chamada dentro da mesma requisição — generateMetadata
// e a página compartilham o mesmo resultado sem repetir a RPC.
export const getPublicBarbershop = cache(async (slug: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_barbershop", {
    p_slug: slug,
  });
  if (error || !data) return null;
  return data as PublicBarbershop;
});

/**
 * Metadata das páginas públicas do tenant. Como generateMetadata resolve
 * ANTES do streaming, o notFound() daqui devolve HTTP 404 de verdade para
 * slug inexistente (com loading.tsx no ar, o notFound() só na página
 * respondia 200 com conteúdo de 404). Bônus: título com o nome da barbearia.
 */
export async function tenantPageMetadata(
  params: Promise<{ tenant: string }>,
  section?: string,
): Promise<Metadata> {
  const { tenant } = await params;
  const data = await getPublicBarbershop(tenant);
  if (!data) notFound();
  const name = data.barbershop.name;
  return {
    title: section ? `${section} — ${name}` : `${name} — Agende seu horário`,
    description: data.settings.heroSubtitle,
  };
}
