import { ImageResponse } from "next/og";

export const alt =
  "NexoBarber — o sistema completo para a sua barbearia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Arte OG da vertical barber: gerada em código, sem asset binário no repo. */
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
          background: "linear-gradient(135deg, #0c0a09 0%, #1c1917 100%)",
          color: "#fafaf9",
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
              background: "#f59e0b",
              color: "#0c0a09",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            ✂
          </div>
          NexoBarber
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
            O sistema completo para a sua barbearia
          </div>
          <div style={{ fontSize: 30, color: "#a8a29e", maxWidth: 900 }}>
            Agenda online, financeiro automático e página de agendamento com a
            sua marca. 7 dias grátis.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            height: 10,
            width: 220,
            borderRadius: 999,
            background: "#f59e0b",
          }}
        />
      </div>
    ),
    size,
  );
}
