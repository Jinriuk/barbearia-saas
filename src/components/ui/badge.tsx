import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-focus-ring focus-visible:ring-[3px] focus-visible:ring-focus-ring/45 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        /**
         * Tons de situação do §5.6 (Fase 1.9). Existiam dois sistemas de cor
         * paralelos para o mesmo conceito: a paleta crua do Tailwind
         * (amber-100/sky-100/rose-100…) num arquivo e os tokens semânticos
         * noutro. Estes tons são a fonte única — fundo tonal do §3, texto e
         * borda na cor viva.
         */
        success: "bg-success-bg text-success border-success/40",
        warning: "bg-warning-bg text-warning border-warning/40",
        info: "bg-info-bg text-info border-info/40",
        danger: "bg-destructive-bg text-destructive border-destructive/40",
        neutral: "bg-neutral-bg text-muted-foreground border-border-control/50",
        purple:
          "bg-accent-purple/15 text-accent-purple border-accent-purple/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
