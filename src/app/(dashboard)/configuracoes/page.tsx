import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can } from "@/lib/permissions";
import { isPlus, planLabel } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { SharePageCard } from "@/components/dashboard/share-page-card";
import {
  SettingsWorkspace,
  type SettingsValues,
} from "@/components/dashboard/settings-workspace";
import { Button } from "@/components/ui/button";

/**
 * Configurações (Fase 3 — item 3.10 / §7.8): seis seções internas, prévia ao
 * vivo com alternador Celular|Computador e um único "Salvar alterações".
 */
export default async function SettingsPage() {
  const tenant = await requireTenant();

  if (!can(tenant.role, "settings:manage")) {
    return (
      <>
        <PageHeader
          eyebrow="Configurações"
          title="Configurações"
          description="Dados da barbearia, regras de agendamento e aparência da página."
        />
        <EmptyState
          title="Acesso restrito"
          description="Apenas o proprietário pode alterar as configurações."
        />
      </>
    );
  }

  const host = (await headers()).get("host");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? (host ? `https://${host}` : "");
  const publicUrl = `${baseUrl}/${tenant.slug}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 640,
    margin: 2,
    color: { dark: "#191816", light: "#ffffff" },
  });

  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: shop }] = await Promise.all([
    supabase
      .from("tenant_settings")
      .select("*")
      .eq("barbershop_id", tenant.id)
      .single(),
    supabase
      .from("barbershops")
      .select("name,logo_url")
      .eq("id", tenant.id)
      .maybeSingle(),
  ]);

  const initial: SettingsValues = {
    businessName: shop?.name ?? tenant.name,
    heroTitle: data?.hero_title ?? "Seu estilo, no seu tempo",
    heroSubtitle:
      data?.hero_subtitle ?? "Escolha o serviço e reserve seu horário.",
    primaryColor: data?.primary_color ?? "#b8893e",
    secondaryColor: data?.secondary_color ?? "#171717",
    backgroundColor: data?.background_color ?? "#faf8f4",
    backgroundType: (data?.background_type as "color" | "image") ?? "color",
    backgroundImageUrl: data?.background_image_url ?? "",
    logoUrl: shop?.logo_url ?? "",
    whatsappNumber: data?.whatsapp_number ?? "",
    instagramUrl: data?.instagram_url ?? "",
    address: data?.address ?? "",
    whatsappRemindersEnabled: data?.whatsapp_reminders_enabled ?? true,
    bookingNoticeMinutes: data?.booking_notice_minutes ?? 60,
    cancellationNoticeMinutes: data?.cancellation_notice_minutes ?? 120,
    bookingHorizonDays: data?.booking_horizon_days ?? 60,
    bookingConfirmationMode:
      (data?.booking_confirmation_mode as "manual" | "auto") ?? "manual",
    maxPendingPerClient: data?.max_pending_per_client ?? 3,
    openingHours: (data?.opening_hours as Record<string, string>) ?? {},
  };

  return (
    <>
      <PageHeader
        eyebrow="Configurações"
        title="Configurações"
        description={`Plano ${planLabel(tenant.plan)}. Dados do negócio, aparência, horário, regras de agendamento e lembretes — tudo salvo de uma vez.`}
        action={
          <div className="flex items-center gap-3">
            <PlanBadge plan={tenant.plan} />
            <Button asChild variant="outline">
              <Link href={`/${tenant.slug}`} target="_blank">
                <ExternalLink /> Ver página de agendamento
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <SharePageCard
          publicUrl={publicUrl}
          qrDataUrl={qrDataUrl}
          slug={tenant.slug}
        />
        <SettingsWorkspace
          key={`${initial.logoUrl}|${initial.backgroundImageUrl}`}
          initial={initial}
          isPlus={isPlus(tenant.plan)}
          slug={tenant.slug}
          publicUrl={publicUrl}
        />
      </div>
    </>
  );
}
