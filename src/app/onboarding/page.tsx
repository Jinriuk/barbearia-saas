import { redirect } from "next/navigation";
import { getTenantContext, requireUser } from "@/lib/auth/dal";
import { AuthCard } from "@/components/forms/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBarbershop } from "@/modules/auth/actions";

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
      <form action={createBarbershop} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da barbearia</Label>
          <Input
            id="name"
            name="name"
            placeholder="Barbearia Aurora"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Endereço público</Label>
          <div className="flex items-center rounded-md border bg-transparent px-3">
            <span className="text-muted-foreground text-sm">/</span>
            <Input
              id="slug"
              name="slug"
              className="border-0 shadow-none focus-visible:ring-0"
              placeholder="barbearia-aurora"
              required
            />
          </div>
        </div>
        <Button className="w-full">Criar barbearia</Button>
      </form>
    </AuthCard>
  );
}
