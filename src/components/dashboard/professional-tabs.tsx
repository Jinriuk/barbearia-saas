"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  ChartNoAxesCombined,
  Contact,
  Scissors,
  UserRound,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Ficha do profissional em cinco abas (Fase 3 — item 3.9 / §7.7).
 *
 * Antes, editar a comissão exigia ir a /comissoes e editar o horário exigia
 * ir a /equipe/horarios — a pessoa não tinha ficha, tinha registros
 * espalhados. As seções são renderizadas no servidor e chegam como children,
 * então os formulários com Server Actions continuam funcionando.
 */
export function ProfessionalTabs({
  dados,
  servicos,
  horarios,
  clientes,
  resultados,
}: {
  dados: ReactNode;
  servicos: ReactNode;
  horarios: ReactNode;
  clientes: ReactNode;
  resultados: ReactNode;
}) {
  return (
    <Tabs defaultValue="dados" className="w-full">
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTrigger value="dados">
          <UserRound /> Dados
        </TabsTrigger>
        <TabsTrigger value="servicos">
          <Scissors /> Serviços e comissões
        </TabsTrigger>
        <TabsTrigger value="horarios">
          <CalendarClock /> Horários
        </TabsTrigger>
        <TabsTrigger value="clientes">
          <Contact /> Clientes
        </TabsTrigger>
        <TabsTrigger value="resultados">
          <ChartNoAxesCombined /> Resultados
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dados" className="mt-4">
        {dados}
      </TabsContent>
      <TabsContent value="servicos" className="mt-4">
        {servicos}
      </TabsContent>
      <TabsContent value="horarios" className="mt-4">
        {horarios}
      </TabsContent>
      <TabsContent value="clientes" className="mt-4">
        {clientes}
      </TabsContent>
      <TabsContent value="resultados" className="mt-4">
        {resultados}
      </TabsContent>
    </Tabs>
  );
}
