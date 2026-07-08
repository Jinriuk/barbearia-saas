"use client";

import { useEffect, useRef } from "react";

/**
 * Parallax decorativo e leve: desloca a camada interna conforme a posição
 * do wrapper na viewport (transform puro, via rAF). Medimos o wrapper — que
 * nunca é transformado — para não realimentar o próprio deslocamento.
 * Desativado com prefers-reduced-motion.
 */
export function Parallax({
  speed = 0.16,
  maxOffset = 100,
  className = "",
  children,
}: {
  speed?: number;
  /** Deslocamento máximo em px — evita frestas quando a seção está longe da viewport. */
  maxOffset?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = outer.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - window.innerHeight / 2;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, -center * speed));
      inner.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed, maxOffset]);

  return (
    <div ref={outerRef} className={className}>
      {/* height/width 100%: quando o wrapper externo é dimensionado por
          position absolute + inset, a camada interna precisa herdar o
          tamanho — sem isso um filho com Image fill colapsa para 0. */}
      <div
        ref={innerRef}
        style={{ willChange: "transform", height: "100%", width: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
