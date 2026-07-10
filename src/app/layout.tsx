import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetaPixel } from "@/components/platform/meta-pixel";
import { ConsentBanner } from "@/components/platform/consent-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://barbearia-saas-sigma.vercel.app";

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
      className={`${geistSans.variable} ${geistMono.variable}`}
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
