import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Fonte única dos hosts de imagem remota: alimenta o img-src da CSP E o
// images.remotePatterns — adicionados juntos, nunca divergem (host liberado
// no otimizador mas bloqueado pelo navegador, ou vice-versa).
const REMOTE_IMAGE_HOSTS = ["images.unsplash.com", "*.supabase.co"];

// CSP sem nonce (mantém as landings estáticas/cacheáveis). 'unsafe-inline'
// em script-src é exigido pelos inlines de hidratação do Next; a proteção
// real aqui é a lista fechada de ORIGENS externas: só Supabase, Vercel
// Analytics e Meta Pixel — qualquer outro script/conexão injetado é
// bloqueado pelo navegador.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://connect.facebook.net https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${REMOTE_IMAGE_HOSTS.map((host) => `https://${host}`).join(" ")} https://www.facebook.com`,
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://connect.facebook.net https://www.facebook.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

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
    remotePatterns: REMOTE_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
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
          { key: "Content-Security-Policy", value: csp },
          {
            // 2 anos + subdomínios (importante para o white-label *.dominio).
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
