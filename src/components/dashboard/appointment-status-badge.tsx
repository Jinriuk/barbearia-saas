import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
  confirmed: {
    label: "Confirmado",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  },
  in_progress: {
    label: "Em atendimento",
    className:
      "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  },
  completed: {
    label: "Concluído",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  canceled: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground",
  },
  no_show: {
    label: "Não compareceu",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

export function appointmentStatusLabel(status: string) {
  return statusMap[status]?.label ?? status;
}

/**
 * Faixa colorida do cartão na grade da agenda (§7.2): a cor identifica a
 * situação de longe, e o selo dentro do cartão repete em texto.
 */
export const APPOINTMENT_STRIPE: Record<string, string> = {
  pending: "border-l-amber-500 bg-amber-500/5",
  confirmed: "border-l-sky-500 bg-sky-500/5",
  in_progress: "border-l-violet-500 bg-violet-500/10",
  completed: "border-l-emerald-500 bg-emerald-500/5",
  canceled: "border-l-muted-foreground/50 bg-muted/40",
  no_show: "border-l-rose-500 bg-rose-500/5",
};

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const entry = statusMap[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={cn("border-transparent", entry.className, className)}>
      {entry.label}
    </Badge>
  );
}
