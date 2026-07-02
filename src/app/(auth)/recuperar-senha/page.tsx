import Link from "next/link";
import { AuthCard } from "@/components/forms/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/modules/auth/actions";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthCard
      title="Recuperar acesso"
      description="Enviaremos um link seguro. Sua senha nunca é enviada por e-mail."
      error={typeof params.error === "string" ? params.error : undefined}
    >
      <form action={requestPasswordReset} className="space-y-4">
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
        <Button className="w-full">Enviar instruções</Button>
      </form>
      <Link href="/login" className="block text-center text-sm text-amber-400">
        Voltar ao login
      </Link>
    </AuthCard>
  );
}
