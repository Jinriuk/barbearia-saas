"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";

/**
 * CTA fixo no polegar, só no celular — e só depois que a capa sai da tela.
 *
 * Antes da Fase 4 havia três botões sólidos idênticos disputando a mesma
 * tela no celular (topo, capa e barra fixa). Agora só um aparece de cada
 * vez: enquanto a capa está visível manda o botão da capa; a partir daí
 * assume a barra.
 */
export function StickyBookCta({
  tenant,
  watchId,
}: {
  tenant: string;
  watchId: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) {
      // Sem a capa na página, o botão é o único caminho — aparece sempre.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      className={cnVisible(visible)}
      // Fora da tela some do fluxo de foco também: nada de botão invisível
      // recebendo Tab.
      aria-hidden={!visible}
    >
      <Link
        href={`/${tenant}/agendar`}
        tabIndex={visible ? undefined : -1}
        className="btn-shine flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-secondary)] text-[15px] font-medium text-[var(--tenant-on-secondary)] shadow-2xl shadow-black/30 transition-transform active:scale-[.98]"
      >
        <CalendarCheck2 className="size-4.5" />
        Agendar horário
      </Link>
    </div>
  );
}

function cnVisible(visible: boolean) {
  return [
    "fixed inset-x-0 bottom-0 z-40 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)] lg:hidden",
    "transition-opacity duration-200",
    visible ? "opacity-100" : "pointer-events-none opacity-0",
  ].join(" ");
}
