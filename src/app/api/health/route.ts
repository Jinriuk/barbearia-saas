export function GET() {
  return Response.json(
    { status: "ok", service: "barbearia-saas" },
    { headers: { "cache-control": "no-store" } },
  );
}
