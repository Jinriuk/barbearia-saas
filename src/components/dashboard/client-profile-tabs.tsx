"use client";

import type { ReactNode } from "react";
import { Crown, FileText, History, LayoutList, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * As cinco abas do perfil do cliente (§7.3). Cada seção é renderizada no
 * servidor e chega como children — os formulários com Server Actions
 * continuam funcionando dentro das abas.
 */
export function ClientProfileTabs({
  resumo,
  historico,
  plano,
  valores,
  observacoes,
}: {
  resumo: ReactNode;
  historico: ReactNode;
  plano: ReactNode;
  valores: ReactNode;
  observacoes: ReactNode;
}) {
  return (
    <Tabs defaultValue="resumo" className="w-full">
      <TabsList className="flex-wrap">
        <TabsTrigger value="resumo">
          <LayoutList /> Resumo
        </TabsTrigger>
        <TabsTrigger value="historico">
          <History /> Histórico
        </TabsTrigger>
        <TabsTrigger value="plano">
          <Crown /> Plano
        </TabsTrigger>
        <TabsTrigger value="valores">
          <Wallet /> Valores
        </TabsTrigger>
        <TabsTrigger value="observacoes">
          <FileText /> Observações
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resumo" className="mt-4">
        {resumo}
      </TabsContent>
      <TabsContent value="historico" className="mt-4">
        {historico}
      </TabsContent>
      <TabsContent value="plano" className="mt-4">
        {plano}
      </TabsContent>
      <TabsContent value="valores" className="mt-4">
        {valores}
      </TabsContent>
      <TabsContent value="observacoes" className="mt-4">
        {observacoes}
      </TabsContent>
    </Tabs>
  );
}
