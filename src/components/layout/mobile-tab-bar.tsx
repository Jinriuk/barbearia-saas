"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export type MobileNavGroup = {
  label?: string;
  items: MobileNavItem[];
};

/**
 * Navegação inferior fixa para celular (Fase 1): Início, Agenda, Clientes e
 * Financeiro fixos (conforme permissão) + botão Menu que abre as demais
 * áreas agrupadas. Substitui a antiga duplicação barra inferior + faixa
 * horizontal de chips.
 */
export function MobileTabBar({
  items,
  menuGroups,
}: {
  items: MobileNavItem[];
  menuGroups: MobileNavGroup[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  // O botão Menu fica "ativo" quando a rota atual pertence a ele.
  const menuActive =
    !items.some((item) => isActive(item.href)) &&
    menuGroups.some((group) => group.items.some((item) => isActive(item.href)));

  return (
    <nav
      aria-label="Navegação rápida"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length + 1}, 1fr)` }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
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
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              menuActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Menu className="size-5" />
            <span>Menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Todas as áreas</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-8">
              {menuGroups.map((group, index) => (
                <div key={group.label ?? index}>
                  {group.label ? (
                    <p className="text-muted-foreground mb-1.5 px-1 text-xs font-semibold tracking-wide uppercase">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
