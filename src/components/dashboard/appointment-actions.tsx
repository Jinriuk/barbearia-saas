import { Check, CheckCheck, Play, RotateCcw, UserX, X } from "lucide-react";
import { updateAppointmentStatus } from "@/modules/appointments/actions";
import { Button } from "@/components/ui/button";

const actionsByStatus: Record<
  string,
  Array<{
    status: string;
    label: string;
    icon: typeof Check;
    variant?: "outline" | "ghost";
    className?: string;
    /** Concluir não pode acontecer no futuro (máquina de estados, Fase 2). */
    notInFuture?: boolean;
  }>
> = {
  pending: [
    {
      status: "confirmed",
      label: "Confirmar",
      icon: Check,
      variant: "outline",
      className: "border-success/40 text-success hover:bg-success-bg",
    },
    // Horário que passou sem nunca ter sido confirmado também é falta — o
    // balcão não deve precisar confirmar um atendimento que não aconteceu.
    {
      status: "no_show",
      label: "Não veio",
      icon: UserX,
      variant: "ghost",
      notInFuture: true,
      className: "text-destructive",
    },
    {
      status: "canceled",
      label: "Cancelar",
      icon: X,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
  confirmed: [
    {
      status: "in_progress",
      label: "Iniciar",
      icon: Play,
      variant: "outline",
      notInFuture: true,
      className:
        "border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10",
    },
    {
      status: "completed",
      label: "Concluir",
      icon: CheckCheck,
      variant: "outline",
      notInFuture: true,
      className: "border-success/40 text-success hover:bg-success-bg",
    },
    {
      status: "no_show",
      label: "Não veio",
      icon: UserX,
      variant: "ghost",
      notInFuture: true,
      className: "text-destructive",
    },
    {
      status: "canceled",
      label: "Cancelar",
      icon: X,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
  in_progress: [
    {
      status: "completed",
      label: "Concluir",
      icon: CheckCheck,
      variant: "outline",
      className: "border-success/40 text-success hover:bg-success-bg",
    },
    {
      status: "confirmed",
      label: "Desfazer início",
      icon: RotateCcw,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
  // Correções explícitas de engano do balcão (voltam para confirmado).
  completed: [
    {
      status: "confirmed",
      label: "Desfazer conclusão",
      icon: RotateCcw,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
  no_show: [
    {
      status: "confirmed",
      label: "Desfazer falta",
      icon: RotateCcw,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
};

export function AppointmentActions({
  appointmentId,
  status,
  startsAt,
}: {
  appointmentId: string;
  status: string;
  /** ISO do início — usado para esconder "Concluir" de horários futuros. */
  startsAt?: string;
}) {
  const inFuture = startsAt ? new Date(startsAt) > new Date() : false;
  const actions = (actionsByStatus[status] ?? []).filter(
    (action) => !(action.notInFuture && inFuture),
  );
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <form key={action.status} action={updateAppointmentStatus}>
          <input type="hidden" name="id" value={appointmentId} />
          <input type="hidden" name="status" value={action.status} />
          <Button
            size="sm"
            variant={action.variant ?? "outline"}
            className={action.className}
          >
            <action.icon className="size-3.5" />
            {action.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
