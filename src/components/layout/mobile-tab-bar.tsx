"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navegação inferior fixa para celular (padrão de app): os itens principais
 * já filtrados por permissão, com ícone renderizado no servidor. A lista
 * completa continua disponível nos chips do topo.
 */
export function MobileTabBar({
  items,
}: {
  items: Array<{ href: string; label: string; icon: React.ReactNode }>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação rápida"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              <span className="max-w-16 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
