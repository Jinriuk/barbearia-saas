import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { isPlus, planLabel } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PlanBadge } from "@/components/dashboard/plan-badge";
import { AppearanceEditor } from "@/components/dashboard/appearance-editor";
import { ContactSettingsForm } from "@/components/dashboard/contact-settings-form";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("barbershop_id", tenant.id)
    .single();

  return (
    <>
      <PageHeader
        eyebrow="White label"
        title="Configurações"
        description={`Sua barbearia está no plano ${planLabel(tenant.plan)}. Ajuste a identidade e as informações da página pública.`}
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
        <AppearanceEditor
          isPlus={isPlus(tenant.plan)}
          slug={tenant.slug}
          initial={{
            heroTitle: data?.hero_title ?? "Seu estilo, no seu tempo",
            heroSubtitle:
              data?.hero_subtitle ?? "Escolha o serviço e reserve seu horário.",
            primaryColor: data?.primary_color ?? "#b8893e",
            secondaryColor: data?.secondary_color ?? "#171717",
            backgroundColor: data?.background_color ?? "#faf8f4",
          }}
        />
        <ContactSettingsForm
          initial={{
            whatsappNumber: data?.whatsapp_number ?? "",
            instagramUrl: data?.instagram_url ?? "",
            address: data?.address ?? "",
          }}
        />
      </div>
    </>
  );
}
