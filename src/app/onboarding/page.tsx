import { redirect } from "next/navigation";
import { getTenantContext, requireUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/forms/auth-card";
import { OnboardingForm } from "@/components/forms/onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  if (await getTenantContext()) redirect("/dashboard");
  const params = await searchParams;
  const planParam =
    typeof params.plano === "string"
      ? params.plano
      : (user.user_metadata?.preferred_plan as string | undefined);
  const defaultPlan = planParam === "plus" ? "plus" : "starter";
  const verticalParam =
    typeof params.vertical === "string"
      ? params.vertical
      : (user.user_metadata?.preferred_vertical as string | undefined);
  const vertical = verticalParam === "salon" ? "salon" : "barber";
  return (
    <AuthCard
      title="Dê nome ao seu espaço"
      description="Esse nome e endereço formarão a primeira página pública."
      error={typeof params.error === "string" ? params.error : undefined}
    >
      <OnboardingForm defaultPlan={defaultPlan} vertical={vertical} />
    </AuthCard>
  );
}
