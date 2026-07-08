import { redirect } from "next/navigation";
import { getTenantContext, requireUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/forms/auth-card";
import { OnboardingForm } from "@/components/forms/onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  if (await getTenantContext()) redirect("/dashboard");
  const params = await searchParams;
  return (
    <AuthCard
      title="Dê nome ao seu espaço"
      description="Esse nome e endereço formarão a primeira página pública."
      error={typeof params.error === "string" ? params.error : undefined}
    >
      <OnboardingForm />
    </AuthCard>
  );
}
