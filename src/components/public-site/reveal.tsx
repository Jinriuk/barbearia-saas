"use client";

import { useEffect, useRef } from "react";

/**
 * Revela o conteúdo quando entra na viewport (fade + subida suave).
 * Usa posição no scroll (rAF) em vez de IntersectionObserver de propósito:
 * um salto de âncora (#servicos) teleporta a página e o IO nunca dispara
 * para as seções que ficaram ACIMA da viewport — elas ficariam invisíveis.
 * Aqui, qualquer elemento com topo acima do fim da viewport é revelado.
 * O estado inicial/transição vive em globals.css (.reveal), que também
 * desativa tudo com prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const cleanup = () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
    const check = () => {
      frame = 0;
      if (el.getBoundingClientRect().top < window.innerHeight - 40) {
        el.classList.add("reveal-visible");
        cleanup();
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return cleanup;
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
