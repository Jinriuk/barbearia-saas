import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // O upload de logo/fundo aceita imagens de até 4 MB; o padrão do Next
      // (1 MB) derrubava a Server Action antes da validação. 5 MB deixa
      // folga para o overhead do multipart/form-data.
      bodySizeLimit: "5mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // As artes de capa padrão são SVGs locais (/public/stock). O combo abaixo
    // é o recomendado pela doc do Next para servir SVG pelo otimizador com
    // segurança (sem scripts, sandbox).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
