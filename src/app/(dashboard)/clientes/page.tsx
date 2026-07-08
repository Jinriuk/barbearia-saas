import { Plus } from "lucide-react";
import { requireTenant } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { archiveClient, saveClient } from "@/modules/clients/actions";
import { ArchiveClientButton } from "@/components/dashboard/archive-client-button";

export default async function ClientsPage() {
  const tenant = await requireTenant();
  const supabase = await createSupabaseServerClient();
  const { data: clientData } = await supabase
    .from("clients")
    .select("id,name,phone,email,active,created_at")
    .eq("barbershop_id", tenant.id)
    .eq("active", true)
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
            <form action={saveClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" inputMode="tel" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações internas</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button className="w-full">Adicionar cliente</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Base de clientes</CardTitle>
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
                        <ArchiveClientButton
                          id={item.id}
                          action={archiveClient}
                          itemName={item.name}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhum cliente cadastrado"
                description="Novos agendamentos públicos também criam clientes automaticamente."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
