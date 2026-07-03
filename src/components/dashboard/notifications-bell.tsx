"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  startsAt: string;
  createdAt: string;
  status: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
};

const POLL_MS = 25000;

export function NotificationsBell({ tenantId }: { tenantId: string }) {
  const storageKey = `notif:lastSeen:${tenantId}`;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem(storageKey) ?? "0");
  });
  const [toast, setToast] = useState<string | null>(null);
  const knownNewest = useRef<number>(0);
  const initialized = useRef(false);

  const unread = items.filter(
    (item) => new Date(item.createdAt).getTime() > lastSeen,
  ).length;

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items: NotificationItem[] };
      const next = data.items ?? [];
      setItems(next);

      const newest = next.length ? new Date(next[0].createdAt).getTime() : 0;
      if (initialized.current && newest > knownNewest.current) {
        setToast(`Novo agendamento — ${next[0].clientName}`);
        window.setTimeout(() => setToast(null), 6000);
      }
      knownNewest.current = Math.max(knownNewest.current, newest);
      initialized.current = true;
    } catch {
      // silencioso: o polling tenta de novo no próximo ciclo
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(poll, 0);
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [poll]);

  function markSeen(open: boolean) {
    if (!open) return;
    const now = Date.now();
    setLastSeen(now);
    window.localStorage.setItem(storageKey, String(now));
  }

  return (
    <>
      <DropdownMenu onOpenChange={markSeen}>
        <DropdownMenuTrigger
          className="hover:bg-muted focus-visible:ring-ring/50 relative grid size-9 place-items-center rounded-full outline-none focus-visible:ring-3"
          aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
        >
          <Bell className="size-4.5" />
          {unread > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="text-foreground text-sm font-medium">
              Novos agendamentos
            </span>
            <Link href="/agenda" className="text-primary text-xs">
              Ver agenda
            </Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              Nada por aqui ainda.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const isNew = new Date(item.createdAt).getTime() > lastSeen;
                return (
                  <Link
                    key={item.id}
                    href="/agenda"
                    className="hover:bg-muted flex items-start gap-3 rounded-md px-2 py-2"
                  >
                    <span className="bg-primary/10 text-primary mt-0.5 grid size-8 shrink-0 place-items-center rounded-full">
                      <CalendarPlus className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.clientName}
                        </span>
                        {isNew ? (
                          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                        ) : null}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {item.serviceName}
                        {item.professionalName
                          ? ` · ${item.professionalName}`
                          : ""}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(item.startsAt))}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {toast ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 bg-popover text-popover-foreground fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg">
          <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full">
            <CalendarPlus className="size-4" />
          </span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      ) : null}
    </>
  );
}
