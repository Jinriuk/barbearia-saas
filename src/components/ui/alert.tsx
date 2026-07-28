import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Avisos do §3 e do §5.7 (Fase 1.8). Antes só existiam `default` e
 * `destructive`, ambos com `bg-card` — nenhum fundo tonal e nenhuma variante
 * de sucesso, atenção ou informação.
 *
 * A regra de cor do guia é seguida à risca: o fundo é o tom apagado
 * (--success-bg e companhia) e a cor viva fica no ícone, no título e na
 * borda esquerda. O texto do corpo continua no tom de leitura, para não
 * cair de contraste.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border border-l-4 px-3 py-2.5 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-l-border",
        destructive:
          "bg-destructive-bg text-foreground border-destructive/40 border-l-destructive *:data-[slot=alert-title]:text-destructive *:[svg]:text-destructive",
        success:
          "bg-success-bg text-foreground border-success/40 border-l-success *:data-[slot=alert-title]:text-success *:[svg]:text-success",
        warning:
          "bg-warning-bg text-foreground border-warning/40 border-l-warning *:data-[slot=alert-title]:text-warning *:[svg]:text-warning",
        info: "bg-info-bg text-foreground border-info/40 border-l-info *:data-[slot=alert-title]:text-info *:[svg]:text-info",
        neutral:
          "bg-neutral-bg text-foreground border-border border-l-border-control *:[svg]:text-foreground-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "[&_a]:hover:text-foreground font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground [&_a]:hover:text-foreground text-sm text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
