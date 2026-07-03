import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "@/modules/settings/actions";

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
        description="Ajuste a mensagem e a identidade da página pública."
      />
      <form action={saveSettings}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Página pública</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="heroTitle">Título principal</Label>
              <Input
                id="heroTitle"
                name="heroTitle"
                defaultValue={data?.hero_title}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="heroSubtitle">Subtítulo</Label>
              <Textarea
                id="heroSubtitle"
                name="heroSubtitle"
                defaultValue={data?.hero_subtitle}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Cor de destaque</Label>
              <Input
                id="primaryColor"
                name="primaryColor"
                type="color"
                defaultValue={data?.primary_color}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Cor escura</Label>
              <Input
                id="secondaryColor"
                name="secondaryColor"
                type="color"
                defaultValue={data?.secondary_color}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Cor de fundo</Label>
              <Input
                id="backgroundColor"
                name="backgroundColor"
                type="color"
                defaultValue={data?.background_color}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                defaultValue={data?.whatsapp_number ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagramUrl">Instagram</Label>
              <Input
                id="instagramUrl"
                name="instagramUrl"
                type="url"
                defaultValue={data?.instagram_url ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                name="address"
                defaultValue={data?.address ?? ""}
              />
            </div>
            <Button className="sm:col-span-2 sm:w-fit">
              Salvar alterações
            </Button>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
