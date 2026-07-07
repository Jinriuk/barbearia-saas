// Utilitários de cor para o site público: as cores do tenant são livres,
// então o texto sobre elas precisa ser calculado para garantir contraste.

function parseHex(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const int = Number.parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Branco ou quase-preto, conforme o que lê melhor sobre a cor dada. */
export function readableTextColor(hex: string) {
  return relativeLuminance(hex) > 0.42 ? "#141210" : "#ffffff";
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type TenantColorSettings = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
};

/** Variáveis CSS do tema do tenant, com os pares de contraste já resolvidos. */
export function tenantStyle(settings: TenantColorSettings) {
  return {
    "--tenant-primary": settings.primaryColor,
    "--tenant-secondary": settings.secondaryColor,
    "--tenant-bg": settings.backgroundColor,
    "--tenant-on-primary": readableTextColor(settings.primaryColor),
    "--tenant-on-secondary": readableTextColor(settings.secondaryColor),
  } as React.CSSProperties;
}
