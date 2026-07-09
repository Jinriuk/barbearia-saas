import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";

/**
 * Super-admin da plataforma (o dono do SaaS): e-mails na env
 * PLATFORM_ADMIN_EMAILS (separados por vírgula). Sem e-mail configurado,
 * ninguém é admin — o painel /admin simplesmente não existe (404).
 */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Exige sessão de super-admin; para qualquer outra pessoa, 404. */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) notFound();
  return user;
}
