"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { LoaderCircle, Send } from "lucide-react";

/**
 * Captura de lead da landing (Fase 5): etapa curta — nome, um contato com
 * consentimento explícito e plano de interesse. UTMs da URL vão junto;
 * nenhuma PII é enviada ao analytics (só o evento). O lead não cria conta.
 */
export function LeadCaptureForm({
  vertical = "barber",
}: {
  vertical?: "barber" | "salon";
}) {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setMessage("");
    try {
      const utm: Record<string, string> = {};
      const params = new URLSearchParams(window.location.search);
      for (const key of [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ]) {
        const value = params.get(key);
        if (value) utm[key] = value.slice(0, 200);
      }
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          contact: data.get("contact"),
          channel,
          consent: data.get("consent") === "on",
          planInterest: data.get("plan") || undefined,
          vertical,
          utm,
          sourcePage: window.location.pathname,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (response.ok && result?.ok) {
        setStatus("done");
        track("lead_submitted", { vertical });
        form.reset();
        return;
      }
      setStatus("error");
      setMessage(result?.error ?? "Não foi possível enviar. Tente de novo.");
    } catch {
      setStatus("error");
      setMessage("Falha de conexão. Tente novamente.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="font-medium text-emerald-300">
          Recebido! Vamos falar com você em breve.
        </p>
        <p className="mt-1 text-sm text-stone-400">
          Enquanto isso, você já pode começar o teste grátis por conta própria.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 text-left">
      <input
        name="name"
        required
        minLength={2}
        maxLength={100}
        placeholder="Seu nome"
        aria-label="Seu nome"
        className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-[15px] text-stone-100 placeholder:text-stone-500"
      />
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <select
          value={channel}
          onChange={(event) =>
            setChannel(event.target.value as "whatsapp" | "email")
          }
          aria-label="Canal de contato"
          className="h-12 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-stone-100"
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </select>
        <input
          name="contact"
          required
          minLength={5}
          maxLength={160}
          type={channel === "email" ? "email" : "tel"}
          placeholder={
            channel === "email" ? "voce@email.com" : "(11) 98765-4321"
          }
          aria-label="Seu contato"
          className="h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-[15px] text-stone-100 placeholder:text-stone-500"
        />
      </div>
      <select
        name="plan"
        defaultValue=""
        aria-label="Plano de interesse"
        className="h-12 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-stone-100"
      >
        <option value="">Plano de interesse (opcional)</option>
        <option value="starter">Padrão</option>
        <option value="plus">Plus</option>
      </select>
      <label className="flex items-start gap-2 text-xs leading-5 text-stone-400">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-4 rounded border-white/20 bg-white/5"
        />
        Autorizo o contato do NexoBarber sobre o produto por este canal. Sem
        spam — e você pode pedir para parar quando quiser.
      </label>
      {status === "error" ? (
        <p className="text-sm text-red-400">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-500 px-6 text-[15px] font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
      >
        {status === "sending" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Quero saber mais
      </button>
    </form>
  );
}
