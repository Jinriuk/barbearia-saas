import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { canSetPasswordWithoutCurrent } from "@/lib/auth/recovery";
import { AuthCard } from "@/components/forms/auth-card";
import { UpdatePasswordForm } from "@/components/forms/update-password-form";
import { Button } from "@/components/ui/button";

export default async function UpdatePasswordPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      "/recuperar-senha?error=O+link+expirou.+Solicite+a+recuperação+novamente",
    );
  }

  // Esta tela só define senha sem pedir a anterior nas duas jornadas em que
  // isso é legítimo (Fase 0 §0.15): link de recuperação ou primeiro acesso do
  // colaborador. Quem chega aqui com uma sessão comum vai para Minha conta,
  // que exige a senha atual — senão a URL seria um desvio da reautenticação.
  if (!(await canSetPasswordWithoutCurrent(user.id))) {
    return (
      <AuthCard
        title="Troque a senha pela sua conta"
        description="Por segurança, mudar a senha com a sessão aberta exige a senha atual."
      >
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/minha-conta">Ir para Minha conta</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/recuperar-senha">Esqueci minha senha</Link>
          </Button>
        </div>
      </AuthCard>
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
