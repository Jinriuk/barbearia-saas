"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Link de navegação com destaque do item ativo. O ícone e o rótulo são
 * passados como children já renderizados pelo shell (server component).
 */
export function NavLink({
  href,
  children,
  size = "default",
}: {
  href: string;
  children: React.ReactNode;
  size?: "default" | "sm";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-medium transition-colors",
        size === "sm" ? "h-8 shrink-0 px-3 text-sm" : "h-9 w-full px-3 text-sm",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
