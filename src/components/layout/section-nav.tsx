"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { SECTION_NAV, type SectionKey } from "@/lib/navigation";
import type { MembershipRole } from "@/types/domain";

/**
 * Navegação dentro de uma área (Fase 1.14).
 *
 * O menu lateral passou a ter os 7 destinos do §9.1; as telas que saíram
 * dele continuam alcançáveis por esta faixa, dentro da própria área. No
 * celular ela rola na horizontal — é navegação, não conteúdo, e o §10 só
 * proíbe rolagem lateral em tabela essencial.
 */
export function SectionNav({
  section,
  role,
}: {
  section: SectionKey;
  role: MembershipRole;
}) {
  const pathname = usePathname();
  const items = SECTION_NAV[section].filter(
    (item) => !item.permission || can(role, item.permission),
  );

  if (items.length < 2) return null;

  return (
    <nav
      aria-label="Seções desta área"
      className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full items-center gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
