import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Próxima etapa"
        title={title}
        description={description}
      />
      <Card>
        <CardContent className="grid min-h-72 place-items-center text-center">
          <div>
            <Construction className="text-primary mx-auto size-9" />
            <p className="mt-5 font-medium">Estrutura segura pronta</p>
            <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm leading-6">
              Banco, isolamento por tenant e políticas já estão modelados. A
              operação deste módulo será ativada depois da validação completa do
              MVP de agenda.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
