import Link from "next/link";
import { Plus } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
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
import {
  archiveClient,
  deleteClientPermanently,
  restoreClient,
} from "@/modules/clients/actions";
import { ClientForm } from "@/components/dashboard/client-form";
import { ArchiveClientButton } from "@/components/dashboard/archive-client-button";
import { RestoreClientButton } from "@/components/dashboard/restore-client-button";
import { DeleteClientForeverButton } from "@/components/dashboard/delete-client-forever-button";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  const tenant = await requireTenant();
  const { arquivados } = await searchParams;
  const showArchived = arquivados === "1";
  const supabase = await createSupabaseServerClient();
  const { data: clientData } = await supabase
    .from("clients")
    .select("id,name,phone,email,active,created_at")
    .eq("barbershop_id", tenant.id)
    .eq("active", !showArchived)
    .order("name");
  const data = clientData ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Cadastro essencial, histórico preservado e dados isolados por barbearia."
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" /> Novo cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              {showArchived ? "Clientes arquivados" : "Base de clientes"}
            </CardTitle>
            <div className="bg-muted inline-flex rounded-lg p-0.5 text-sm">
              <Button
                asChild
                size="sm"
                variant={showArchived ? "ghost" : "secondary"}
              >
                <Link href="/clientes">Ativos</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant={showArchived ? "secondary" : "ghost"}
              >
                <Link href="/clientes?arquivados=1">Arquivados</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <p>{item.phone}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.email || "Sem e-mail"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {showArchived ? (
                          <span className="inline-flex items-center gap-1">
                            <RestoreClientButton
                              id={item.id}
                              action={restoreClient}
                              itemName={item.name}
                            />
                            {tenant.role === "owner" ||
                            tenant.role === "manager" ? (
                              <DeleteClientForeverButton
                                id={item.id}
                                action={deleteClientPermanently}
                                itemName={item.name}
                              />
                            ) : null}
                          </span>
                        ) : (
                          <ArchiveClientButton
                            id={item.id}
                            action={archiveClient}
                            itemName={item.name}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title={
                  showArchived
                    ? "Nenhum cliente arquivado"
                    : "Nenhum cliente cadastrado"
                }
                description={
                  showArchived
                    ? "Clientes que você arquivar aparecem aqui para restaurar."
                    : "Novos agendamentos públicos também criam clientes automaticamente."
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
