"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ToastVariant = "success" | "destructive" | "warning" | "info";

export type ToastAction = {
  label: string;
  /** Chamada ao clicar. Pode ser assíncrona; o aviso fecha ao terminar. */
  onAction: () => void | Promise<void>;
};

export type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  /** Tempo até sumir, em ms. `null` mantém o aviso até o usuário fechar. */
  duration?: number | null;
  action?: ToastAction;
};

type ToastRecord = ToastInput & { id: number };

/** §5.7: janela de "Desfazer" de alguns segundos. */
export const UNDO_DURATION = 6000;
const DEFAULT_DURATION = 4500;

const icons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  destructive: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const variantClasses: Record<ToastVariant, string> = {
  success:
    "bg-success-bg border-success/40 border-l-success [&_svg]:text-success",
  destructive:
    "bg-destructive-bg border-destructive/40 border-l-destructive [&_svg]:text-destructive",
  warning:
    "bg-warning-bg border-warning/40 border-l-warning [&_svg]:text-warning",
  info: "bg-info-bg border-info/40 border-l-info [&_svg]:text-info",
};

type ToastContextValue = {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Camada de aviso do §5.7 (Fase 1.7).
 *
 * O projeto não tinha nenhuma: o sucesso era um <Alert> dentro do próprio
 * formulário e, em 6 dos 9 painéis laterais, ele era descartado — o painel
 * fechava e a mensagem ia junto. Sem essa camada também não havia como
 * cumprir o "Desfazer" temporizado que o guia pede.
 *
 * A região é `aria-live="polite"` e o texto não é cortado por animação: o
 * §5.7 proíbe aviso que some antes de ser lido, por isso o cronômetro pausa
 * quando o ponteiro entra ou o foco cai dentro do aviso.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback((input: ToastInput) => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { ...input, id }]);
    return id;
  }, []);

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Avisos"
        // Acima da barra inferior do celular (§9.2) para não cobrir a
        // navegação; no computador fica no canto inferior direito.
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:px-0"
      >
        <div aria-live="polite" aria-atomic="false" className="contents">
          {toasts.map((item) => (
            <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const { id, action } = toast;
  const variant = toast.variant ?? "success";
  const Icon = icons[variant];
  const [paused, setPaused] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  const duration =
    toast.duration === undefined
      ? action
        ? UNDO_DURATION
        : DEFAULT_DURATION
      : toast.duration;

  React.useEffect(() => {
    if (duration === null || paused) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [duration, paused, id, onDismiss]);

  async function handleAction() {
    if (!action || running) return;
    setRunning(true);
    try {
      await action.onAction();
    } finally {
      onDismiss(id);
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "text-foreground pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border border-l-4 p-3 shadow-lg",
        variantClasses[variant],
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="grid flex-1 gap-0.5">
        {toast.title ? (
          <p className="text-sm font-medium">{toast.title}</p>
        ) : null}
        <p className="text-sm">{toast.description}</p>
      </div>
      {action ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={running}
          onClick={handleAction}
        >
          {running ? "…" : action.label}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Fechar aviso"
        onClick={() => onDismiss(id)}
      >
        <X />
      </Button>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  }
  return context;
}

/**
 * Ponte entre `useActionState` e a camada de aviso. Serve aos painéis
 * laterais que fecham no sucesso: sem ela a mensagem morre junto com o
 * painel. O erro continua sendo mostrado em linha pelo próprio formulário
 * (§5.2 quer o erro perto do campo), por isso o padrão é avisar só o sucesso.
 */
export function useActionToast(
  state: { success: boolean; message: string },
  options: { errors?: boolean } = {},
) {
  const { toast } = useToast();
  const seen = React.useRef(state);
  const showErrors = options.errors ?? false;

  React.useEffect(() => {
    // O estado inicial de useActionState não é resultado de nada — só as
    // trocas de referência posteriores representam uma ação concluída.
    if (seen.current === state) return;
    seen.current = state;
    if (!state.message) return;
    if (state.success) {
      toast({ description: state.message, variant: "success" });
    } else if (showErrors) {
      toast({ description: state.message, variant: "destructive" });
    }
  }, [state, toast, showErrors]);
}
