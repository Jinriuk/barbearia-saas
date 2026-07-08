"use client";

import type { ReactNode } from "react";
import { KeyRound, Users } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Unifica "Profissionais" e "Acessos & papéis" numa única área com abas
 * (etapa 3). As duas seções são renderizadas no servidor e passadas como
 * children — os formulários com Server Actions continuam funcionando.
 */
export function TeamTabs({
  professionals,
  access,
}: {
  professionals: ReactNode;
  access: ReactNode;
}) {
  return (
    <Tabs defaultValue="profissionais" className="w-full">
      <TabsList>
        <TabsTrigger value="profissionais">
          <Users /> Profissionais
        </TabsTrigger>
        <TabsTrigger value="acessos">
          <KeyRound /> Acessos e papéis
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profissionais" className="mt-4">
        {professionals}
      </TabsContent>
      <TabsContent value="acessos" className="mt-4">
        {access}
      </TabsContent>
    </Tabs>
  );
}
