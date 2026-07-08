import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Minus, ShieldCheck } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { can, type Permission } from "@/lib/permissions";
import type { MembershipRole } from "@/types/domain";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roles: Array<{ role: MembershipRole; label: string }> = [
  { role: "owner", label: "Proprietário" },
  { role: "manager", label: "Gerente" },
  { role: "receptionist", label: "Secretária" },
  { role: "professional", label: "Profissional" },
];

const capabilities: Array<{ permission: Permission; label: string }> = [
  { permission: "dashboard:view", label: "Ver o painel" },
  { permission: "appointments:manage", label: "Gerenciar a agenda" },
  { permission: "clients:manage", label: "Gerenciar clientes" },
  { permission: "catalog:manage", label: "Serviços e produtos" },
  { permission: "inventory:manage", label: "Controlar estoque" },
  { permission: "finance:view", label: "Financeiro e contas" },
  { permission: "reports:view", label: "Relatórios e comissões" },
  { permission: "settings:manage", label: "Configurações e página pública" },
  { permission: "memberships:manage", label: "Gerenciar a equipe" },
];

export default async function PermissionsPage() {
  const tenant = await requireTenant();
  if (!can(tenant.role, "memberships:manage")) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Segurança"
        title="Permissões"
        description="O que cada papel pode fazer. As regras valem na interface, no servidor e no banco de dados."
        action={
          <Button asChild variant="outline">
            <Link href="/profissionais">Gerenciar equipe</Link>
          </Button>
        }
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" /> Matriz de acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  {roles.map((item) => (
                    <TableHead key={item.role} className="text-center">
                      {item.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {capabilities.map((capability) => (
                  <TableRow key={capability.permission}>
                    <TableCell className="font-medium">
                      {capability.label}
                    </TableCell>
                    {roles.map((item) => (
                      <TableCell key={item.role} className="text-center">
                        {can(item.role, capability.permission) ? (
                          <Check className="mx-auto size-4 text-emerald-600" />
                        ) : (
                          <Minus className="text-muted-foreground/40 mx-auto size-4" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground mt-4 text-xs leading-5">
            Profissionais também veem a própria agenda e as próprias comissões.
            Além desta matriz, o banco de dados aplica isolamento por barbearia
            (RLS) em todas as tabelas.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
