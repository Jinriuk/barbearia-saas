import {
  CalendarCheck,
  CircleCheck,
  CircleX,
  Clock,
  PlayCircle,
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
 *
 * "Em atendimento" (Fase 2.2) não está na tabela do guia — é estado novo.
 * Recebe o tom roxo, o único que não colide com os quatro já usados.
 */
const statusMap: Record<
  string,
  { label: string; tone: Tone; icon: typeof Clock }
> = {
  pending: { label: "Pendente", tone: "warning", icon: Clock },
  confirmed: { label: "Confirmado", tone: "info", icon: CalendarCheck },
  in_progress: {
    label: "Em atendimento",
    tone: "purple",
    icon: PlayCircle,
  },
  completed: { label: "Concluído", tone: "success", icon: CircleCheck },
  canceled: { label: "Cancelado", tone: "danger", icon: CircleX },
  no_show: { label: "Não compareceu", tone: "neutral", icon: UserX },
};

export function appointmentStatusLabel(status: string) {
  return statusMap[status]?.label ?? status;
}

/**
 * Faixa colorida do cartão na grade da agenda (§7.2): a cor identifica a
 * situação de longe, e o selo dentro do cartão repete em texto. Usa os
 * mesmos tokens do selo — nada de paleta crua paralela.
 */
export const APPOINTMENT_STRIPE: Record<string, string> = {
  pending: "border-l-warning bg-warning-bg/40",
  confirmed: "border-l-info bg-info-bg/40",
  in_progress: "border-l-accent-purple bg-accent-purple/10",
  completed: "border-l-success bg-success-bg/40",
  canceled: "border-l-destructive bg-destructive-bg/30",
  no_show: "border-l-border-control bg-neutral-bg/50",
};

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
