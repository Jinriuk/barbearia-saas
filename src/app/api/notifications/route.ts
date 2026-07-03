import { getTenantContext } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export async function GET() {
  const tenant = await getTenantContext();
  if (!tenant) return Response.json({ items: [] }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id,starts_at,created_at,status,client:clients(name),service:services(name),professional:professionals(name)",
    )
    .eq("barbershop_id", tenant.id)
    .in("source", ["public", "client"])
    .order("created_at", { ascending: false })
    .limit(12);

  const items = (data ?? []).map((item) => ({
    id: item.id,
    startsAt: item.starts_at,
    createdAt: item.created_at,
    status: item.status,
    clientName: first(item.client)?.name ?? "Cliente",
    serviceName: first(item.service)?.name ?? "Serviço",
    professionalName: first(item.professional)?.name ?? "",
  }));

  return Response.json({ items }, { headers: { "cache-control": "no-store" } });
}
