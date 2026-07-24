import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetaPixel } from "@/components/platform/meta-pixel";
import { ConsentBanner } from "@/components/platform/consent-banner";
import { APP_URL } from "@/lib/app-url";
import "./globals.css";

// Fonte do design system (Fase 1): Inter em todo o app; mono continua Geist.
const interSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "NexoBarber",
    template: "%s · NexoBarber",
  },
  description: "Agenda, equipe e operação da sua barbearia em um só lugar.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "NexoBarber",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${interSans.variable} ${geistMono.variable}`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <MetaPixel />
        <ConsentBanner />
      </body>
    </html>
  );
}
