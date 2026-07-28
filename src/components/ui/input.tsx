import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Campo de texto na escala do §5.2/§10: 48px no celular, 44px no computador
 * (antes 32px). A borda usa --border-control, não o divisor: o divisor dava
 * 1,47:1 sobre o cartão, contra os 3:1 do §12 (Fase 1.3). O anel de foco é o
 * azul do §11 (Fase 1.4).
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-border-control bg-field file:text-foreground placeholder:text-muted-foreground focus-visible:border-focus-ring focus-visible:ring-focus-ring/45 disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-12 w-full min-w-0 rounded-lg border px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:h-11",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
