import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/env";

// Domínio raiz do SaaS (ex.: "nexobarber.com.br"). Quando definido, cada
// subdomínio vira a página pública do tenant: aurora.nexobarber.com.br → /aurora.
const RESERVED_SUBDOMAINS = new Set(["www", "app", "painel", "admin"]);

function rewriteTenantSubdomain(request: NextRequest) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.toLowerCase();
  if (!rootDomain) return null;

  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";
  if (!host.endsWith(`.${rootDomain}`)) return null;

  const subdomain = host.slice(0, -(rootDomain.length + 1));
  if (
    !subdomain ||
    subdomain.includes(".") ||
    RESERVED_SUBDOMAINS.has(subdomain)
  ) {
    return null;
  }

  const path = request.nextUrl.pathname;
  if (path.startsWith("/api") || path.startsWith("/auth")) return null;
  // Links internos da página pública já vêm prefixados com o slug.
  if (path === `/${subdomain}` || path.startsWith(`/${subdomain}/`))
    return null;

  const url = request.nextUrl.clone();
  url.pathname = `/${subdomain}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export async function updateSession(request: NextRequest) {
  const tenantRewrite = rewriteTenantSubdomain(request);
  if (tenantRewrite) return tenantRewrite;

  let response = NextResponse.next({ request });
  const { url, anonKey } = getPublicSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
