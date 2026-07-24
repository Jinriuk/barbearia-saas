"use client";

import { useTransition } from "react";
import { BellOff, MessageCircle } from "lucide-react";
import {
  logClientContact,
  setContactOutcome,
  toggleClientOptOut,
} from "@/modules/clients/actions";
import { Button } from "@/components/ui/button";

const OUTCOMES = [
  { value: "sem_resposta", label: "Sem resposta" },
  { value: "respondeu", label: "Respondeu" },
  { value: "agendou", label: "Agendou" },
  { value: "nao_quer_contato", label: "Não quer contato" },
];

/**
 * Ação de retorno por WhatsApp (Fase 3): abre a conversa com o texto
 * EDITÁVEL já preenchido e registra que o contato foi iniciado (uma vez por
 * clique). O resultado é marcado depois no select — "não quer contato"
 * liga o opt-out e interrompe a régua.
 */
export function ClientContactActions({
  clientId,
  whatsappHref,
  optOut,
  lastContactOutcome,
  hasRecentContact,
}: {
  clientId: string;
  whatsappHref: string | null;
  optOut: boolean;
  lastContactOutcome: string | null;
  hasRecentContact: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function openAndLog() {
    if (!whatsappHref) return;
    window.open(whatsappHref, "_blank", "noopener");
    const formData = new FormData();
    formData.set("clientId", clientId);
    startTransition(() => logClientContact(formData));
  }

  function markOutcome(value: string) {
    if (!value) return;
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("outcome", value);
    startTransition(() => setContactOutcome(formData));
  }

  function flipOptOut() {
    const formData = new FormData();
    formData.set("clientId", clientId);
    formData.set("optOut", String(optOut));
    startTransition(() => toggleClientOptOut(formData));
  }

  if (optOut) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <BellOff className="size-3.5" /> Sem contato
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={flipOptOut}
          className="text-muted-foreground text-xs"
        >
          Reativar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {whatsappHref ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={openAndLog}
          className="text-success border-success/40"
        >
          <MessageCircle className="size-3.5" /> Chamar
        </Button>
      ) : null}
      {hasRecentContact ? (
        <select
          value={lastContactOutcome ?? ""}
          onChange={(event) => markOutcome(event.target.value)}
          disabled={pending}
          aria-label="Resultado do último contato"
          className="border-input bg-background h-8 rounded-lg border px-1.5 text-xs"
        >
          <option value="">Resultado…</option>
          {OUTCOMES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={flipOptOut}
        aria-label="Não contatar este cliente"
        title="Não contatar este cliente"
        className="text-muted-foreground"
      >
        <BellOff className="size-3.5" />
      </Button>
    </div>
  );
}
