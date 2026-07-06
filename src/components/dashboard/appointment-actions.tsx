import { Check, CheckCheck, UserX, X } from "lucide-react";
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
  }>
> = {
  pending: [
    {
      status: "confirmed",
      label: "Confirmar",
      icon: Check,
      variant: "outline",
      className:
        "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400",
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
      status: "completed",
      label: "Concluir",
      icon: CheckCheck,
      variant: "outline",
      className:
        "border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400",
    },
    {
      status: "no_show",
      label: "Não veio",
      icon: UserX,
      variant: "ghost",
      className: "text-rose-600 dark:text-rose-400",
    },
    {
      status: "canceled",
      label: "Cancelar",
      icon: X,
      variant: "ghost",
      className: "text-muted-foreground",
    },
  ],
};

export function AppointmentActions({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const actions = actionsByStatus[status];
  if (!actions?.length) return null;

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
