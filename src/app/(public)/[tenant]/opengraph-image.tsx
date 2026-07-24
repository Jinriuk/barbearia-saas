import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import type { PublicBarbershop } from "@/types/domain";

export const alt = "Agende seu horário online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Crawlers sociais re-raspam o mesmo link repetidamente; o nome do negócio
// muda raramente — 1h de cache evita RPC + render de PNG idênticos por hit.
export const revalidate = 3600;

const THEME = {
  barber: {
    background: "linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)",
    text: "#fafaf9",
    muted: "#a8a29e",
    accent: "#f59e0b",
    brand: "NexoBarber",
    // Letra da marca em vez de emoji: a fonte embutida do satori não tem os
    // glifos ✂/❀ e o download dinâmico de fonte falha em build sem rede.
    glyph: "N",
    accentText: "#0c0a09",
  },
  salon: {
    background: "linear-gradient(135deg, #fdf6f9 0%, #f7e8ef 100%)",
    text: "#33202b",
    muted: "#33202b99",
    accent: "#c2497c",
    brand: "NexoBeleza",
    glyph: "N",
    accentText: "#ffffff",
  },
} as const;

/**
 * OG image por tenant: nome do negócio + CTA, na paleta da vertical. Vale
 * para todas as páginas públicas do slug (home, agendar, serviços…), que é
 * exatamente o link que o dono compartilha no WhatsApp/Instagram.
 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;

  // Client direto (sem cookies): a rota de imagem não tem sessão e a RPC é
  // pública por design. Falhou/slug inexistente → arte genérica da marca.
  let data: PublicBarbershop | null = null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey);
      // Timeout curto: preview de link não pode ficar pendurado num fetch;
      // sem resposta a tempo, sai a arte genérica da vertical.
      const { data: rpcData } = await supabase
        .rpc("get_public_barbershop", { p_slug: tenant })
        .abortSignal(AbortSignal.timeout(3000));
      data = (rpcData as PublicBarbershop) ?? null;
    } catch {
      data = null;
    }
  }

  const vertical = data?.barbershop.vertical === "salon" ? "salon" : "barber";
  const theme = THEME[vertical];
  const name = data?.barbershop.name ?? theme.brand;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: theme.background,
        color: theme.text,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 64,
          height: 64,
          borderRadius: 999,
          background: theme.accent,
          color: theme.accentText,
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
        }}
      >
        {theme.glyph}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 32, color: theme.muted }}>
          Agende seu horário online — rápido, sem ligação.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            borderRadius: 999,
            background: theme.accent,
          }}
        />
        <div style={{ fontSize: 24, color: theme.muted }}>
          {`Reserva online · ${theme.brand}`}
        </div>
      </div>
    </div>,
    size,
  );
}
