import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublicBarbershop } from "@/types/domain";

export async function getPublicBarbershop(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_barbershop", {
    p_slug: slug,
  });
  if (error || !data) return null;
  return data as PublicBarbershop;
}
