"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck2,
  Check,
  ChevronRight,
  ChevronUp,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import type {
  PublicAppointment,
  PublicProduct,
  PublicProfessional,
  PublicService,
} from "@/types/domain";
import {
  availableUnits,
  bookingSteps,
  isSoldOut,
  PAYMENT_PREFERENCES,
  paymentPreferenceLabel,
} from "@/lib/booking";
import { formatPhoneBR } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingSuccess } from "./booking-success";

type Slot = {
  starts_at: string;
  ends_at: string;
  professional_id?: string;
  professional_name?: string;
};
type Cart = Record<string, number>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const DAY_MS = 86_400_000;

/** Próximos 14 dias a partir do "hoje" do fuso da barbearia. */
function buildDayOptions(todayInTz: string) {
  const [year, month, day] = todayInTz.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base + index * DAY_MS);
    return {
      value: date.toISOString().slice(0, 10),
      dayNumber: date.getUTCDate(),
      weekday:
        index === 0
          ? "Hoje"
          : index === 1
            ? "Amanhã"
            : weekday.format(date).replace(".", ""),
    };
  });
}

function slotHourInTz(iso: string, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date(iso)),
  );
}

const inputClass = "h-12 rounded-xl bg-white/60 text-base";

/**
 * Fluxo público de agendamento em 7 etapas (§7.11).
 *
 * Antes da Fase 4 isto era uma página rolável com no máximo 5 seções
 * reveladas conforme o preenchimento. Agora é uma decisão por tela: no
 * celular só a etapa atual aparece, com "Continuar" fixo embaixo e o resumo
 * recolhido em "Ver resumo"; no computador, trilha numerada no topo e resumo
 * fixo na coluna da direita.
 */
export function BookingForm({
  tenant,
  timezone,
  todayInTz,
  services,
  professionals,
  products,
  isPlus,
  initialServiceId,
  initialProfessionalId,
  whatsappHref,
  vertical,
}: {
  tenant: string;
  timezone: string;
  todayInTz: string;
  services: PublicService[];
  professionals: PublicProfessional[];
  products: PublicProduct[];
  isPlus: boolean;
  initialServiceId?: string;
  initialProfessionalId?: string;
  whatsappHref: string | null;
  vertical?: "barber" | "salon";
}) {
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [professionalId, setProfessionalId] = useState(
    initialProfessionalId ?? "",
  );
  // "Primeiro disponível": consulta todos os profissionais de uma vez; o
  // profissional real é definido junto com o horário escolhido.
  const [firstAvailable, setFirstAvailable] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState("");
  const [knownName, setKnownName] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(initialServiceId ? 1 : 0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<PublicAppointment | null>(null);

  const days = useMemo(() => buildDayOptions(todayInTz), [todayInTz]);
  const availableProfessionals = useMemo(
    () =>
      professionals.filter(
        (item) => !serviceId || item.serviceIds.includes(serviceId),
      ),
    [professionals, serviceId],
  );
  const showUpsell = isPlus && products.length > 0;
  const steps = useMemo(() => bookingSteps(showUpsell), [showUpsell]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const selectedService = services.find((item) => item.id === serviceId);
  const selectedProfessional = professionals.find(
    (item) => item.id === professionalId,
  );
  const cartItems = products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ product, quantity: cart[product.id] }));
  const productsTotal = cartItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const orderTotal = (selectedService?.price ?? 0) + productsTotal;
  const phoneDigits = phone.replace(/\D/g, "");

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
      }),
    [timezone],
  );
  const dayFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    [timezone],
  );

  const slotGroups = useMemo(() => {
    const groups: Array<{ label: string; items: Slot[] }> = [
      { label: "Manhã", items: [] },
      { label: "Tarde", items: [] },
      { label: "Noite", items: [] },
    ];
    for (const item of slots) {
      const hour = slotHourInTz(item.starts_at, timezone);
      if (hour < 12) groups[0].items.push(item);
      else if (hour < 18) groups[1].items.push(item);
      else groups[2].items.push(item);
    }
    return groups.filter((group) => group.items.length > 0);
  }, [slots, timezone]);

  const requestSeq = useRef(0);
  const topRef = useRef<HTMLDivElement>(null);

  async function fetchSlots(
    service: string,
    professional: string,
    day: string,
    anyProfessional = false,
  ) {
    const requestId = ++requestSeq.current;
    setLoadingSlots(true);
    setSlot("");
    setSlots([]);
    setMessage("");
    try {
      const url = anyProfessional
        ? `/api/public/${tenant}/first-available?${new URLSearchParams({
            serviceId: service,
            date: day,
          })}`
        : `/api/public/${tenant}/availability?${new URLSearchParams({
            serviceId: service,
            professionalId: professional,
            date: day,
          })}`;
      const response = await fetch(url);
      const result = (await response.json()) as {
        slots?: Slot[];
        error?: string;
      };
      if (requestId !== requestSeq.current) return;
      // No "primeiro disponível" pode haver vários profissionais no mesmo
      // horário — mostra só o primeiro de cada horário (já vem ordenado).
      const seen = new Set<string>();
      const list = (result.slots ?? []).filter((item) => {
        if (!anyProfessional) return true;
        if (seen.has(item.starts_at)) return false;
        seen.add(item.starts_at);
        return true;
      });
      setSlots(list);
      if (result.error) setMessage(result.error);
    } catch {
      if (requestId !== requestSeq.current) return;
      setMessage("Não foi possível consultar os horários.");
    }
    setLoadingSlots(false);
  }

  /** Ao trocar de etapa o cliente precisa começar do topo da decisão nova. */
  useEffect(() => {
    topRef.current?.scrollIntoView({
      behavior:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      block: "start",
    });
  }, [stepIndex]);

  /**
   * Reconhecimento do cliente recorrente (§7.11): assim que o WhatsApp fica
   * completo, pergunta ao servidor o primeiro nome e preenche sozinho. Só
   * preenche campo vazio — quem digitou o próprio nome manda mais que a base.
   */
  const lookupRef = useRef("");
  useEffect(() => {
    if (step.key !== "contact") return;
    if (phoneDigits.length < 10 || phoneDigits === lookupRef.current) return;
    const digits = phoneDigits;
    const timer = setTimeout(async () => {
      lookupRef.current = digits;
      try {
        const response = await fetch(`/api/public/${tenant}/client-lookup`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: digits }),
        });
        const result = (await response.json()) as {
          found?: boolean;
          firstName?: string | null;
        };
        if (!result.found || !result.firstName) return;
        setKnownName(result.firstName);
        setName((current) => (current.trim() ? current : result.firstName!));
      } catch {
        // Reconhecer é conveniência: falhar aqui não pode travar a reserva.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phoneDigits, step.key, tenant]);

  /**
   * Única porta de troca de etapa: fecha o resumo e, ao chegar na escolha do
   * horário sem dia definido, já abre no primeiro dia — ninguém quer uma
   * tela de horários vazia esperando um toque extra.
   */
  function goToStep(index: number) {
    const target = Math.max(0, Math.min(index, steps.length - 1));
    setSummaryOpen(false);
    if (steps[target]?.key === "datetime" && !date && serviceId) {
      const firstDay = days[0]?.value;
      if (firstDay) {
        setDate(firstDay);
        void fetchSlots(serviceId, professionalId, firstDay, firstAvailable);
      }
    }
    setStepIndex(target);
  }

  function selectService(id: string) {
    setServiceId(id);
    setProfessionalId("");
    setFirstAvailable(false);
    setSlot("");
    setSlots([]);
    setDate("");
  }

  function selectProfessional(id: string) {
    setProfessionalId(id);
    setFirstAvailable(false);
    if (date) void fetchSlots(serviceId, id, date);
    else {
      setSlot("");
      setSlots([]);
    }
  }

  function selectFirstAvailable() {
    setFirstAvailable(true);
    setProfessionalId("");
    if (date) void fetchSlots(serviceId, "", date, true);
    else {
      setSlot("");
      setSlots([]);
    }
  }

  function selectDate(value: string) {
    setDate(value);
    void fetchSlots(serviceId, professionalId, value, firstAvailable);
  }

  function selectSlot(item: Slot) {
    setSlot(item.starts_at);
    // "Primeiro disponível": o profissional real vem junto com o horário.
    if (firstAvailable && item.professional_id) {
      setProfessionalId(item.professional_id);
    }
  }

  function addProduct(product: PublicProduct) {
    const limit = Math.min(99, availableUnits(product.stock));
    setCart((prev) => ({
      ...prev,
      [product.id]: Math.min((prev[product.id] ?? 0) + 1, limit),
    }));
  }
  function removeProduct(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      const value = (next[id] ?? 0) - 1;
      if (value <= 0) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  const canContinue = (() => {
    switch (step.key) {
      case "service":
        return Boolean(serviceId);
      case "professional":
        return Boolean(professionalId || firstAvailable);
      case "datetime":
        return Boolean(slot);
      case "contact":
        return name.trim().length >= 2 && phoneDigits.length >= 10;
      default:
        return true;
    }
  })();

  async function submit() {
    if (!slot || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/public/${tenant}/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          professionalId,
          startsAt: slot,
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          notes,
          paymentPreference: payment,
          products: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });
      // Resposta pode não ser JSON (502/erro de proxy) — não deixa quebrar.
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        appointment?: PublicAppointment | null;
        error?: string;
      } | null;
      if (response.ok && result?.ok && result.appointment) {
        setCreated(result.appointment);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(result?.error ?? "Não foi possível reservar. Tente de novo.");
      // O horário pode ter sido tomado: volta para a escolha com a agenda
      // atualizada, em vez de deixar o cliente batendo no mesmo botão.
      setSlot("");
      goToStep(steps.findIndex((item) => item.key === "datetime"));
      if (date)
        void fetchSlots(serviceId, professionalId, date, firstAvailable);
    } catch {
      // Falha de rede (offline, troca de rede): mantém tudo preenchido.
      setMessage("Falha de conexão. Verifique sua internet e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canContinue) return;
    if (step.key === "review") {
      void submit();
      return;
    }
    goToStep(stepIndex + 1);
  }

  if (created) {
    return (
      <BookingSuccess
        tenant={tenant}
        appointment={created}
        timezone={timezone}
        whatsappHref={whatsappHref}
        vertical={vertical}
      />
    );
  }

  const summary = (
    <BookingSummary
      serviceName={selectedService?.name ?? null}
      professionalName={
        selectedProfessional?.name ??
        (firstAvailable ? "Primeiro disponível" : null)
      }
      when={
        slot
          ? `${dayFormat.format(new Date(slot))} · ${timeFormat.format(new Date(slot))}`
          : null
      }
      items={cartItems.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price * item.quantity,
      }))}
      servicePrice={selectedService?.price ?? null}
      payment={step.key === "review" ? paymentPreferenceLabel(payment) : null}
      total={orderTotal}
    />
  );

  return (
    <div
      ref={topRef}
      className="scroll-mt-24 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-10"
    >
      <div className="min-w-0">
        {/* Trilha numerada (computador) */}
        <ol className="mb-8 hidden items-center gap-1 lg:flex">
          {steps.map((item, index) => {
            const done = index < stepIndex;
            const current = index === stepIndex;
            return (
              <li key={item.key} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => done && goToStep(index)}
                  disabled={!done}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                    current
                      ? "bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]"
                      : done
                        ? "opacity-70 hover:bg-current/[.06] hover:opacity-100"
                        : "opacity-35",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                      current
                        ? "bg-[var(--tenant-on-secondary)]/20"
                        : "border border-current/30",
                    )}
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  {item.short}
                </button>
                {index < steps.length - 1 ? (
                  <ChevronRight className="size-3.5 opacity-25" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* Cabeçalho da etapa (celular) */}
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              aria-label="Voltar para a etapa anterior"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-current/15 transition-colors active:scale-[.96]"
            >
              <ArrowLeft className="size-4.5" />
            </button>
          ) : null}
          <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-50">
            Etapa {stepIndex + 1} de {steps.length}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <h2 className="flex items-baseline gap-2 text-xl font-semibold tracking-tight">
            {step.title}
            {step.optional ? (
              <span className="text-xs font-normal opacity-45">opcional</span>
            ) : null}
          </h2>

          <div className="mt-5">
            {step.key === "service" ? (
              <div className="grid gap-2.5">
                {services.map((service) => {
                  const selected = serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectService(service.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[.99]",
                        selected
                          ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-lg shadow-black/10"
                          : "border-black/10 bg-white/50 hover:border-black/25",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p
                          className={cn(
                            "mt-1 flex items-center gap-1.5 text-xs",
                            selected ? "opacity-70" : "opacity-50",
                          )}
                        >
                          <Clock3 className="size-3.5" />
                          {service.durationMinutes} min
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-sm font-semibold",
                          selected
                            ? "text-[var(--tenant-on-secondary)]"
                            : "text-[var(--tenant-secondary)]",
                        )}
                      >
                        {currency.format(Number(service.price))}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step.key === "professional" ? (
              <div className="flex flex-wrap gap-2.5">
                {availableProfessionals.length > 1 ? (
                  <button
                    type="button"
                    aria-pressed={firstAvailable}
                    onClick={selectFirstAvailable}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full border py-2 pr-5 pl-2 transition-all active:scale-[.98]",
                      firstAvailable
                        ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                        : "border-black/10 bg-white/50 hover:border-black/25",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-full",
                        firstAvailable
                          ? "bg-[var(--tenant-on-secondary)]/15"
                          : "bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]",
                      )}
                    >
                      <Sparkles className="size-4" />
                    </span>
                    <span className="text-sm font-medium">
                      Primeiro disponível
                    </span>
                  </button>
                ) : null}
                {availableProfessionals.map((professional) => {
                  // Em "primeiro disponível" o profissional só é resolvido
                  // junto com o horário — o chip dele não pode acender antes.
                  const selected =
                    !firstAvailable && professionalId === professional.id;
                  return (
                    <button
                      key={professional.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectProfessional(professional.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full border py-2 pr-5 pl-2 transition-all active:scale-[.98]",
                        selected
                          ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                          : "border-black/10 bg-white/50 hover:border-black/25",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 place-items-center rounded-full text-sm font-semibold",
                          selected
                            ? "bg-[var(--tenant-on-secondary)]/15"
                            : "bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]",
                        )}
                      >
                        {professional.name.slice(0, 1)}
                      </span>
                      <span className="text-sm font-medium">
                        {professional.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step.key === "datetime" ? (
              <div>
                <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
                  {days.map((day) => {
                    const selected = date === day.value;
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectDate(day.value)}
                        className={cn(
                          "flex w-16 shrink-0 snap-start flex-col items-center gap-0.5 rounded-2xl border py-3 transition-all active:scale-[.97]",
                          selected
                            ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                            : "border-black/10 bg-white/50 hover:border-black/25",
                        )}
                      >
                        <span
                          className={cn(
                            "text-[11px] font-medium capitalize",
                            selected ? "opacity-75" : "opacity-50",
                          )}
                        >
                          {day.weekday}
                        </span>
                        <span className="text-lg font-semibold">
                          {day.dayNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {loadingSlots ? (
                  <p className="mt-5 flex items-center gap-2 text-sm opacity-60">
                    <LoaderCircle className="size-4 animate-spin" />
                    Buscando horários…
                  </p>
                ) : null}

                {!loadingSlots && date && slots.length === 0 ? (
                  <p className="mt-5 rounded-2xl border border-black/10 bg-white/50 px-4 py-3.5 text-sm opacity-70">
                    Nenhum horário livre nesse dia. Tente outra data.
                  </p>
                ) : null}

                {!loadingSlots && slotGroups.length > 0 ? (
                  <div className="mt-5 space-y-5">
                    {slotGroups.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold tracking-wide uppercase opacity-45">
                          {group.label}
                        </p>
                        <div
                          className={cn(
                            "mt-2.5 grid gap-2",
                            firstAvailable
                              ? "grid-cols-3 sm:grid-cols-4"
                              : "grid-cols-4 sm:grid-cols-6",
                          )}
                        >
                          {group.items.map((item) => {
                            const selected = slot === item.starts_at;
                            return (
                              <button
                                key={`${item.starts_at}-${item.professional_id ?? ""}`}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectSlot(item)}
                                className={cn(
                                  "rounded-xl border font-mono text-sm transition-all active:scale-[.96]",
                                  firstAvailable ? "min-h-11 py-1.5" : "h-11",
                                  selected
                                    ? "border-transparent bg-[var(--tenant-secondary)] font-semibold text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                                    : "border-black/10 bg-white/50 hover:border-black/25",
                                )}
                              >
                                {timeFormat.format(new Date(item.starts_at))}
                                {firstAvailable && item.professional_name ? (
                                  <span
                                    className={cn(
                                      "block truncate px-1 font-sans text-[10px]",
                                      selected ? "opacity-75" : "opacity-50",
                                    )}
                                  >
                                    {item.professional_name}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {step.key === "contact" ? (
              <div className="grid gap-4">
                {/* WhatsApp primeiro (§7.11): é ele que reconhece o cliente. */}
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 98765-4321"
                    required
                    value={phone}
                    onChange={(event) =>
                      setPhone(formatPhoneBR(event.target.value))
                    }
                    className={inputClass}
                  />
                  {knownName ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--tenant-secondary)]">
                      <Check className="size-4" />
                      Que bom te ver de novo, {knownName}!
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="Seu nome"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observação (opcional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Alguma preferência?"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-20 rounded-xl bg-white/60 text-base"
                  />
                </div>
                <p className="text-xs leading-relaxed opacity-60">
                  Seus dados serão usados apenas para confirmar e lembrar este
                  horário, conforme a{" "}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Política de Privacidade
                  </a>
                  .
                </p>
              </div>
            ) : null}

            {step.key === "extras" ? (
              <div className="grid gap-2.5">
                {products.map((product) => {
                  const quantity = cart[product.id] ?? 0;
                  const soldOut = isSoldOut(product.stock);
                  const atLimit = quantity >= availableUnits(product.stock);
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-3",
                        soldOut && "opacity-55",
                      )}
                    >
                      <ProductThumb
                        name={product.name}
                        imageUrl={product.imageUrl}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {product.name}
                        </p>
                        <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--tenant-secondary)]">
                          {currency.format(Number(product.price))}
                        </p>
                      </div>
                      {soldOut ? (
                        <span className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium">
                          Indisponível
                        </span>
                      ) : quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <QuantityButton
                            label={`Remover ${product.name}`}
                            onClick={() => removeProduct(product.id)}
                          >
                            <Minus className="size-4" />
                          </QuantityButton>
                          <span className="w-5 text-center font-mono text-sm font-semibold">
                            {quantity}
                          </span>
                          <QuantityButton
                            label={`Adicionar ${product.name}`}
                            disabled={atLimit}
                            onClick={() => addProduct(product)}
                          >
                            <Plus className="size-4" />
                          </QuantityButton>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addProduct(product)}
                          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] active:scale-[.97]"
                        >
                          <Plus className="size-4" /> Adicionar
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex + 1)}
                  className="mt-1 h-11 rounded-full text-sm font-medium underline underline-offset-4 opacity-70 transition-opacity hover:opacity-100"
                >
                  Pular esta etapa
                </button>
              </div>
            ) : null}

            {step.key === "payment" ? (
              <div>
                <p className="flex items-start gap-2.5 rounded-2xl border border-black/10 bg-white/50 px-4 py-3.5 text-sm leading-6 opacity-75">
                  <Wallet className="mt-0.5 size-4 shrink-0" />
                  Você paga no local, no dia do atendimento. Diga como pretende
                  pagar para o caixa já ficar preparado.
                </p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {PAYMENT_PREFERENCES.map((option) => {
                    const selected = payment === option.value;
                    return (
                      <button
                        key={option.value || "undecided"}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setPayment(option.value)}
                        className={cn(
                          "flex h-12 items-center justify-between rounded-2xl border px-4 text-sm font-medium transition-all active:scale-[.99]",
                          selected
                            ? "border-transparent bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)] shadow-md shadow-black/10"
                            : "border-black/10 bg-white/50 hover:border-black/25",
                        )}
                      >
                        {option.label}
                        {selected ? <Check className="size-4" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step.key === "review" ? (
              <div className="space-y-4">
                {summary}
                <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-3.5 text-sm">
                  <p className="font-medium">{name}</p>
                  <p className="mt-0.5 opacity-60">{phone}</p>
                  {email ? <p className="opacity-60">{email}</p> : null}
                  {notes ? (
                    <p className="mt-1.5 opacity-60">“{notes}”</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {message ? (
            <p
              role="alert"
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700"
            >
              {message}
            </p>
          ) : null}

          {/* Ação fixa no celular; linha normal no computador. */}
          <div className="sticky bottom-3 z-30 mt-7 lg:static lg:mt-8">
            {summaryOpen ? (
              <div className="mb-2 lg:hidden">{summary}</div>
            ) : null}
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--tenant-secondary)] p-3 pl-4 text-[var(--tenant-on-secondary)] shadow-xl shadow-black/25 lg:bg-transparent lg:p-0 lg:shadow-none">
              <button
                type="button"
                onClick={() => setSummaryOpen((open) => !open)}
                aria-expanded={summaryOpen}
                className="min-w-0 flex-1 text-left lg:hidden"
              >
                <span className="flex items-center gap-1 text-xs opacity-70">
                  Ver resumo
                  <ChevronUp
                    className={cn(
                      "size-3.5 transition-transform",
                      !summaryOpen && "rotate-180",
                    )}
                  />
                </span>
                <span className="block font-mono text-lg font-semibold">
                  {currency.format(orderTotal)}
                </span>
              </button>
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  className="hidden h-12 items-center rounded-xl border border-current/20 px-5 text-[15px] font-medium transition-colors hover:bg-current/[.05] lg:inline-flex"
                >
                  Voltar
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!canContinue || submitting}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-6 text-[15px] font-semibold text-[var(--tenant-on-primary)] transition-all not-disabled:hover:opacity-90 not-disabled:active:scale-[.98] disabled:opacity-40 lg:flex-1 lg:justify-center"
              >
                {submitting ? (
                  <LoaderCircle className="size-4.5 animate-spin" />
                ) : step.key === "review" ? (
                  <CalendarCheck2 className="size-4.5" />
                ) : null}
                {step.key === "review" ? "Confirmar reserva" : "Continuar"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Resumo fixo (computador) */}
      <aside className="sticky top-24 hidden lg:block">{summary}</aside>
    </div>
  );
}

function BookingSummary({
  serviceName,
  professionalName,
  when,
  items,
  servicePrice,
  payment,
  total,
}: {
  serviceName: string | null;
  professionalName: string | null;
  when: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
  servicePrice: number | null;
  payment: string | null;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-[var(--tenant-secondary)]">
      <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-45">
        Resumo
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <SummaryLine
          label="Serviço"
          value={serviceName}
          amount={servicePrice}
        />
        <SummaryLine label="Profissional" value={professionalName} />
        <SummaryLine label="Quando" value={when} />
        {items.map((item) => (
          <SummaryLine
            key={item.name}
            label={`${item.name} × ${item.quantity}`}
            value=" "
            amount={item.price}
          />
        ))}
        {payment ? <SummaryLine label="Pagamento" value={payment} /> : null}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="font-mono text-base font-semibold">
          {currency.format(total)}
        </span>
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  amount,
}: {
  label: string;
  value: string | null;
  amount?: number | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 opacity-50">{label}</dt>
      <dd className="min-w-0 text-right font-medium">
        {value?.trim() ? <span className="capitalize">{value}</span> : null}
        {amount != null ? (
          <span className="ml-2 font-mono text-xs opacity-70">
            {currency.format(Number(amount))}
          </span>
        ) : null}
        {!value?.trim() && amount == null ? (
          <span className="opacity-35">a escolher</span>
        ) : null}
      </dd>
    </div>
  );
}

function ProductThumb({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  // §7.10: produto sem foto usa miniatura padronizada, nunca uma área vazia.
  if (!imageUrl) {
    return (
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-black/[.05]">
        <ShoppingBag className="size-5 opacity-40" />
      </span>
    );
  }
  return (
    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-black/[.05]">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="56px"
        className="object-cover"
      />
    </span>
  );
}

function QuantityButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-black/15 transition-colors not-disabled:hover:bg-black/[.04] not-disabled:active:scale-[.95] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
