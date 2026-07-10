import { ImageResponse } from "next/og";

export const alt =
  "NexoBeleza — o sistema completo para o seu salão de beleza";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Arte OG da vertical salon: paleta clara/rosé da landing NexoBeleza. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fdf6f9 0%, #f7e8ef 100%)",
          color: "#33202b",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#c2497c",
              color: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            ❀
          </div>
          NexoBeleza
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -2,
              maxWidth: 950,
            }}
          >
            O sistema completo para o seu salão de beleza
          </div>
          <div style={{ fontSize: 30, color: "#33202b99", maxWidth: 900 }}>
            Agenda online, financeiro automático e uma página de agendamento
            linda com a sua marca. 7 dias grátis.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            borderRadius: 999,
            background: "#c2497c",
          }}
        />
      </div>
    ),
    size,
  );
}
