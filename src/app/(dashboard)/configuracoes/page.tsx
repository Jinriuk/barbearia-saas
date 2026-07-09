import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { isPlus, planLabel } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { AppearanceEditor } from "@/components/dashboard/appearance-editor";
import { SharePageCard } from "@/components/dashboard/share-page-card";
import { ContactSettingsForm } from "@/components/dashboard/contact-settings-form";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const tenant = await requireTenant();
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
      .select("logo_url")
      .eq("id", tenant.id)
      .maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="White label"
        title="Identidade Visual"
        description={`Sua barbearia está no plano ${planLabel(tenant.plan)}. Ajuste a logo, as cores, o fundo e as informações da página pública.`}
        action={
          <div className="flex items-center gap-3">
            <PlanBadge plan={tenant.plan} />
            <Button asChild variant="outline">
              <Link href={`/${tenant.slug}`} target="_blank">
                <ExternalLink /> Ver página
              </Link>
            </Button>
          </div>
        }
      />
      <div className="max-w-5xl space-y-6">
        <SharePageCard
          publicUrl={publicUrl}
          qrDataUrl={qrDataUrl}
          slug={tenant.slug}
        />
        <AppearanceEditor
          key={`${shop?.logo_url ?? ""}|${data?.background_type ?? "color"}|${data?.background_image_url ?? ""}`}
          isPlus={isPlus(tenant.plan)}
          slug={tenant.slug}
          initial={{
            heroTitle: data?.hero_title ?? "Seu estilo, no seu tempo",
            heroSubtitle:
              data?.hero_subtitle ?? "Escolha o serviço e reserve seu horário.",
            primaryColor: data?.primary_color ?? "#b8893e",
            secondaryColor: data?.secondary_color ?? "#171717",
            backgroundColor: data?.background_color ?? "#faf8f4",
            backgroundType:
              (data?.background_type as "color" | "image") ?? "color",
            backgroundImageUrl: data?.background_image_url ?? "",
            logoUrl: shop?.logo_url ?? "",
          }}
        />
        <ContactSettingsForm
          initial={{
            whatsappNumber: data?.whatsapp_number ?? "",
            instagramUrl: data?.instagram_url ?? "",
            address: data?.address ?? "",
            whatsappRemindersEnabled: data?.whatsapp_reminders_enabled ?? true,
          }}
        />
      </div>
    </>
  );
}
