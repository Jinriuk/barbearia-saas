import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://barbearia-saas-sigma.vercel.app";

/**
 * Sitemap das páginas da PLATAFORMA (landings, legais e demos públicas).
 * As páginas de tenants não são enumeradas de propósito: são dos clientes e
 * ganham indexação pelos links que eles próprios divulgam.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${APP_URL}/`, lastModified: now, priority: 1 },
    { url: `${APP_URL}/salao`, lastModified: now, priority: 1 },
    { url: `${APP_URL}/aurora`, lastModified: now, priority: 0.6 },
    { url: `${APP_URL}/studio-aurora`, lastModified: now, priority: 0.6 },
    { url: `${APP_URL}/privacidade`, lastModified: now, priority: 0.3 },
    { url: `${APP_URL}/termos`, lastModified: now, priority: 0.3 },
  ];
}
