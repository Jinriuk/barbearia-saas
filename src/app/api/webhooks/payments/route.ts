export async function POST(request: Request) {
  if (!process.env.PAYMENTS_WEBHOOK_SECRET) {
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 503 },
    );
  }
  const signature = request.headers.get("x-webhook-signature");
  if (!signature)
    return Response.json({ error: "Assinatura ausente." }, { status: 401 });
  return Response.json({ received: true, implemented: false }, { status: 202 });
}
