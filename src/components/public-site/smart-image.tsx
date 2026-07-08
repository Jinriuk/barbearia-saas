"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * next/image com fallback local (etapa 14.2): se a foto remota falhar no
 * otimizador ou no navegador, troca para a arte local sem quebrar o layout.
 * Assim as páginas podem usar fotos reais (Unsplash via otimizador do Next,
 * que busca no servidor) com degradação garantida para os SVGs do projeto.
 */
export function SmartImage({
  src,
  fallbackSrc,
  alt,
  ...props
}: ImageProps & { fallbackSrc: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      src={failed ? fallbackSrc : src}
      onError={() => setFailed(true)}
    />
  );
}
