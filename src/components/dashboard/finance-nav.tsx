import Link from "next/link";
import { cn } from "@/lib/utils";

export const FINANCE_SECTIONS = [
  { value: "resumo", label: "Resumo" },
  { value: "caixa", label: "Caixa e vendas" },
  { value: "despesas", label: "Despesas" },
  { value: "a-receber", label: "A receber" },
  { value: "comissoes", label: "Comissões" },
  { value: "relatorios", label: "Relatórios" },
] as const;

export type FinanceSection = (typeof FINANCE_SECTIONS)[number]["value"];

export function resolveFinanceSection(
  value: string | undefined,
): FinanceSection {
  const match = FINANCE_SECTIONS.find((section) => section.value === value);
  return match?.value ?? "resumo";
}

/**
 * Seções internas do Financeiro (Fase 3 — item 3.1 / §7.5).
 *
 * Antes eram 904 linhas numa página só, mais quatro rotas soltas no menu
 * (Despesas, A receber, Comissões, Relatórios) que o dono precisava caçar
 * uma a uma. Agora é um endereço com seis seções — e o período escolhido
 * sobrevive à troca de seção, que é o comportamento que faz o fechamento de
 * quinzena funcionar.
 */
export function FinanceNav({
  active,
  query,
}: {
  active: FinanceSection;
  /** Query string do período, sem "?" (ver `periodQuery`). */
  query: string;
}) {
  return (
    <nav
      aria-label="Seções do financeiro"
      className="-mx-1 scrollbar-none overflow-x-auto px-1"
    >
      <ul className="flex min-w-max items-center gap-1 border-b">
        {FINANCE_SECTIONS.map((section) => {
          const current = section.value === active;
          return (
            <li key={section.value}>
              <Link
                href={`/financeiro?secao=${section.value}&${query}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  current
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
