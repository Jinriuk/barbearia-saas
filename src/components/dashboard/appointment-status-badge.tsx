import {
  CalendarCheck,
  CircleCheck,
  CircleX,
  Clock,
  UserX,
} from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Selo de situação do atendimento (§5.6, Fase 1.9).
 *
 * Duas correções. As cores de "Cancelado" e "Não compareceu" estavam
 * invertidas: a tabela do guia pede vermelho para o cancelamento e cinza
 * para a falta, e o arquivo tinha exatamente o contrário. E o mapa usava a
 * paleta crua do Tailwind enquanto o resto do painel usava os tokens
 * semânticos — dois sistemas de cor para o mesmo conceito; agora tudo passa
 * pelos tons do Badge.
 *
 * O ícone atende ao "ícone + texto + cor" do §5.6, e faz a cor deixar de ser
 * a única forma de distinguir a situação (§12).
 */
const statusMap: Record<
  string,
  { label: string; tone: Tone; icon: typeof Clock }
> = {
  pending: { label: "Pendente", tone: "warning", icon: Clock },
  confirmed: { label: "Confirmado", tone: "info", icon: CalendarCheck },
  completed: { label: "Concluído", tone: "success", icon: CircleCheck },
  canceled: { label: "Cancelado", tone: "danger", icon: CircleX },
  no_show: { label: "Não compareceu", tone: "neutral", icon: UserX },
};

export function appointmentStatusLabel(status: string) {
  return statusMap[status]?.label ?? status;
}

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const entry = statusMap[status];
  if (!entry) {
    return (
      <Badge variant="neutral" className={className}>
        {status}
      </Badge>
    );
  }
  const Icon = entry.icon;
  return (
    <Badge variant={entry.tone} className={cn("gap-1", className)}>
      <Icon aria-hidden />
      {entry.label}
    </Badge>
  );
}
