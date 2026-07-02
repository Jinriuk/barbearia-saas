import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/modules/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Bem-vindo de volta"
      description="Entre para abrir a operação da sua barbearia."
      error={typeof params.error === "string" ? params.error : undefined}
      message={typeof params.message === "string" ? params.message : undefined}
    >
      <form action={signIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs text-amber-400">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </div>
        <Button className="w-full">Entrar</Button>
      </form>
      <p className="text-center text-sm text-stone-400">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-amber-400">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  );
}
