"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";
import { createBarbershop } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLANS, formatPriceBRL, type PlanKey } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function OnboardingForm({
  defaultPlan = "starter",
}: {
  defaultPlan?: PlanKey;
}) {
  const [plan, setPlan] = useState<PlanKey>(defaultPlan);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // Enquanto o usuário não editar o slug manualmente, ele acompanha o nome.
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={createBarbershop} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da barbearia</Label>
        <Input
          id="name"
          name="name"
          placeholder="Barbearia Aurora"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
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
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Gerado automaticamente do nome — sua página ficará em{" "}
          <span className="font-medium">/{slug || "sua-barbearia"}</span>. Você
          pode ajustar.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Plano — 7 dias grátis para testar
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const item = PLANS[key];
            const selected = plan === key;
            return (
              <label
                key={key}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-primary/30 ring-2"
                    : "hover:border-foreground/25",
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={key}
                  checked={selected}
                  onChange={() => setPlan(key)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">
                  {item.label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {formatPriceBRL(item.priceCents)}/mês
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          A primeira cobrança só acontece depois do teste. Você pode mudar de
          plano quando quiser.
        </p>
      </fieldset>
      <Button className="w-full">Criar barbearia</Button>
    </form>
  );
}
