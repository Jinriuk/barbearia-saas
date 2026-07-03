import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import {
  PasswordForm,
  ProfileForm,
} from "@/components/dashboard/account-forms";

export default async function AccountPage() {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name,phone")
    .eq("id", tenant.profileId)
    .single();

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Minha conta"
        description="Atualize seus dados de acesso e informações pessoais."
      />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <ProfileForm
          initial={{
            name: profile?.name ?? tenant.profileName,
            phone: profile?.phone ?? "",
            email: user?.email ?? "",
          }}
        />
        <PasswordForm />
      </div>
    </>
  );
}
