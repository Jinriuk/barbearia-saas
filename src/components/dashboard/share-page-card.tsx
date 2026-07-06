"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SharePageCard({
  publicUrl,
  qrDataUrl,
  slug,
}: {
  publicUrl: string;
  qrDataUrl: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // navegador sem permissão de clipboard: o campo continua selecionável
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="size-4" /> Divulgue sua página
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Imprima o QR Code no balcão, no espelho ou no cartão: o cliente
          escaneia e cai direto na sua página de agendamento.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div className="mx-auto w-fit rounded-2xl border bg-white p-3">
          <Image
            src={qrDataUrl}
            alt={`QR Code da página pública /${slug}`}
            width={170}
            height={170}
            unoptimized
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Link da sua página</p>
            <div className="flex gap-2">
              <Input readOnly value={publicUrl} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                onClick={copyLink}
                aria-label="Copiar link"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={qrDataUrl} download={`qrcode-${slug}.png`}>
                <Download className="size-4" /> Baixar QR Code (PNG)
              </a>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-5">
            Dica: baixe o PNG em alta resolução e use em impressos. O mesmo link
            funciona no Instagram, no WhatsApp e no Google Perfil da Empresa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
