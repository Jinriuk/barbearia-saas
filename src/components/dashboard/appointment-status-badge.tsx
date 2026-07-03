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
