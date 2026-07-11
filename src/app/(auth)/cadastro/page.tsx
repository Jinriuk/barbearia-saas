import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/modules/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Crie sua conta"
      description="Você configurará a primeira barbearia no próximo passo."
      error={typeof params.error === "string" ? params.error : undefined}
    >
      <form action={signUp} className="space-y-4">
        <input
          type="hidden"
          name="plano"
          value={typeof params.plano === "string" ? params.plano : "starter"}
        />
        <input
          type="hidden"
          name="vertical"
          value={params.vertical === "salon" ? "salon" : "barber"}
        />
        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
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
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-stone-500">Use ao menos 8 caracteres.</p>
        </div>
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-stone-400">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-0.5 size-4 shrink-0 accent-amber-500"
          />
          <span>
            Li e aceito os{" "}
            <Link
              href="/termos"
              target="_blank"
              className="text-amber-400 underline underline-offset-2"
            >
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              target="_blank"
              className="text-amber-400 underline underline-offset-2"
            >
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        <Button className="w-full">Criar conta</Button>
      </form>
      <p className="text-center text-sm text-stone-400">
        Já tem conta?{" "}
        <Link href="/login" className="text-amber-400">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
