"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";
import { createBarbershop } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
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
      <Button className="w-full">Criar barbearia</Button>
    </form>
  );
}
