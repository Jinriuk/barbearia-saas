import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/forms/auth-card";
import { UpdatePasswordForm } from "@/components/forms/update-password-form";

export default async function UpdatePasswordPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      "/recuperar-senha?error=O+link+expirou.+Solicite+a+recuperação+novamente",
    );
  }

  return (
    <AuthCard
      title="Defina sua nova senha"
      description="Escolha uma senha forte com pelo menos 8 caracteres."
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}
