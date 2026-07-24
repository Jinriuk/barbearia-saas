"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarCheck2,
  Check,
  Clock3,
  LoaderCircle,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import type {
  PublicProduct,
  PublicProfessional,
  PublicService,
} from "@/types/domain";
import { verticalCopy } from "@/lib/verticals";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

export function BookingForm({
  tenant,
  timezone,
  todayInTz,
  services,
  professionals,
  products,
  isPlus,
  initialServiceId,
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
  whatsappHref: string | null;
  vertical?: "barber" | "salon";
}) {
  const copy = verticalCopy(vertical);
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [professionalId, setProfessionalId] = useState("");
  // "Primeiro disponível": consulta todos os profissionais de uma vez; o
  // profissional real é definido junto com o horário escolhido.
  const [firstAvailable, setFirstAvailable] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<string>("pending");
  const [manageToken, setManageToken] = useState<string | null>(null);

  const days = useMemo(() => buildDayOptions(todayInTz), [todayInTz]);
  const availableProfessionals = useMemo(
    () =>
      professionals.filter(
        (item) => !serviceId || item.serviceIds.includes(serviceId),
      ),
    [professionals, serviceId],
  );
  const showUpsell = isPlus && products.length > 0;

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

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
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

  /**
   * Leva o cliente até o próximo passo assim que ele escolhe — no celular o
   * passo seguinte nasce abaixo da dobra e, sem isso, muita gente para no
   * meio sem perceber que o fluxo continuou.
   */
  function scrollToStep(id: string) {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
  }

  function selectService(id: string) {
    setServiceId(id);
    setProfessionalId("");
    setFirstAvailable(false);
    setSlot("");
    setSlots([]);
    scrollToStep("passo-profissional");
  }

  function selectProfessional(id: string) {
    setProfessionalId(id);
    setFirstAvailable(false);
    if (date) void fetchSlots(serviceId, id, date);
    else {
      setSlot("");
      setSlots([]);
    }
    scrollToStep("passo-horario");
  }

  function selectFirstAvailable() {
    setFirstAvailable(true);
    setProfessionalId("");
    if (date) void fetchSlots(serviceId, "", date, true);
    else {
      setSlot("");
      setSlots([]);
    }
    scrollToStep("passo-horario");
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
    scrollToStep(showUpsell ? "passo-extra" : "passo-dados");
  }

  function addProduct(id: string) {
    setCart((prev) => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + 1, 99) }));
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

  async function submit(formData: FormData) {
    if (!slot) return;
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
          clientName: formData.get("name"),
          clientPhone: formData.get("phone"),
          clientEmail: formData.get("email"),
          notes: formData.get("notes"),
          products: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });
      // Resposta pode não ser JSON (502/erro de proxy) — não deixa quebrar.
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        reference?: string;
        status?: string;
        token?: string;
        error?: string;
      } | null;
      if (response.ok && result?.ok) {
        setReference(result.reference ?? null);
        // Status realmente persistido: no modo automático nasce confirmada.
        setFinalStatus(result.status ?? "pending");
        setManageToken(result.token ?? null);
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(result?.error ?? "Não foi possível reservar. Tente de novo.");
      setSlot("");
      setSlots([]);
      // Recarrega a disponibilidade: o horário pode ter sido tomado.
      try {
        const query = new URLSearchParams({ serviceId, professionalId, date });
        const refreshed = await fetch(
          `/api/public/${tenant}/availability?${query}`,
        );
        const data = (await refreshed.json()) as { slots?: Slot[] };
        setSlots(data.slots ?? []);
      } catch {
        // Falha ao atualizar horários não deve travar o formulário.
      }
    } catch {
      // Falha de rede (ERR_NETWORK_CHANGED, ERR_NAME_NOT_RESOLVED, offline):
      // mantém o horário selecionado para reenvio rápido.
      setMessage("Falha de conexão. Verifique sua internet e tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const slotDate = slot ? new Date(slot) : null;
    const confirmed = finalStatus === "confirmed";
    // Link "Adicionar ao calendário" (Google) — instantes em UTC.
    const calendarHref =
      slotDate && selectedService
        ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
            selectedService.name,
          )}&dates=${[
            slotDate,
            new Date(
              slotDate.getTime() + selectedService.durationMinutes * 60_000,
            ),
          ]
            .map((d) => d.toISOString().replace(/[-:]|\.\d{3}/g, ""))
            .join("/")}&ctz=${encodeURIComponent(timezone)}`
        : null;
    return (
      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/60">
        <div className="px-6 pt-12 pb-8 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">
            {confirmed ? "Reserva confirmada!" : "Solicitação enviada!"}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 opacity-60">
            {confirmed
              ? "Seu horário está garantido. Guarde os detalhes:"
              : copy.confirmationNote}
          </p>
        </div>
        <div className="px-5 pb-6">
          <dl className="divide-y divide-black/[.06] rounded-2xl border border-black/10 bg-white/70">
            {reference ? (
              <SummaryRow label="Referência" value={reference} />
            ) : null}
            <SummaryRow
              label="Status"
              value={confirmed ? "Confirmada" : "Aguardando confirmação"}
            />
            <SummaryRow label="Serviço" value={selectedService?.name ?? "—"} />
            <SummaryRow
              label="Profissional"
              value={selectedProfessional?.name ?? "—"}
            />
            {slotDate ? (
              <SummaryRow
                label="Quando"
                value={`${new Intl.DateTimeFormat("pt-BR", {
                  timeZone: timezone,
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                }).format(slotDate)}, ${timeFormat.format(slotDate)}`}
              />
            ) : null}
            {cartItems.map((item) => (
              <SummaryRow
                key={item.product.id}
                label={`${item.product.name} × ${item.quantity}`}
                value={currency.format(item.product.price * item.quantity)}
              />
            ))}
            <div className="flex items-center justify-between px-4 py-3.5">
              <dt className="text-sm font-semibold">Total</dt>
              <dd className="font-mono text-base font-semibold">
                {currency.format(orderTotal)}
              </dd>
            </div>
          </dl>
          {calendarHref ? (
            <a
              href={calendarHref}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <CalendarCheck2 className="size-4.5" />
              Adicionar ao calendário
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-[15px] font-medium transition-colors hover:bg-black/[.04]"
            >
              <MessageCircle className="size-4.5" />
              {copy.talkToBusiness}
            </a>
          ) : null}
          {manageToken ? (
            <p className="mt-4 text-center text-xs opacity-60">
              Precisa mudar?{" "}
              <a
                href={`/${tenant}/reserva/${manageToken}`}
                className="underline underline-offset-2"
              >
                Cancelar ou remarcar esta reserva
              </a>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-9 pb-4">
      {/* 1. Serviço */}
      <section>
        <StepTitle number={1} title="Escolha o serviço" />
        <div className="mt-4 grid gap-2.5">
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
      </section>

      {/* 2. Profissional */}
      {serviceId ? (
        <section id="passo-profissional" className="scroll-mt-24">
          <StepTitle number={2} title="Escolha o profissional" />
          <div className="mt-4 flex flex-wrap gap-2.5">
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
                    "grid size-8 place-items-center rounded-full text-sm font-semibold",
                    firstAvailable
                      ? "bg-[var(--tenant-on-secondary)]/15"
                      : "bg-[var(--tenant-secondary)] text-[var(--tenant-on-secondary)]",
                  )}
                >
                  ⚡
                </span>
                <span className="text-sm font-medium">Primeiro disponível</span>
              </button>
            ) : null}
            {availableProfessionals.map((professional) => {
              const selected = professionalId === professional.id;
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
        </section>
      ) : null}

      {/* 3. Data e horário */}
      {serviceId && (professionalId || firstAvailable) ? (
        <section id="passo-horario" className="scroll-mt-24">
          <StepTitle number={3} title="Escolha o dia e o horário" />
          <div className="-mx-5 mt-4 flex snap-x gap-2 overflow-x-auto px-5 pb-1">
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
                  <span className="text-lg font-semibold">{day.dayNumber}</span>
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
        </section>
      ) : null}

      {/* Produtos (upsell Plus) */}
      {showUpsell && slot ? (
        <section id="passo-extra" className="scroll-mt-24">
          <StepTitle
            number={4}
            title="Quer levar um produto?"
            icon={<ShoppingBag className="size-4" />}
            optional
          />
          <div className="mt-4 grid gap-2.5">
            {products.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--tenant-secondary)]">
                      {currency.format(Number(product.price))}
                    </p>
                  </div>
                  {quantity > 0 ? (
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
                        onClick={() => addProduct(product.id)}
                      >
                        <Plus className="size-4" />
                      </QuantityButton>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addProduct(product.id)}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] active:scale-[.97]"
                    >
                      <Plus className="size-4" /> Adicionar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Seus dados */}
      {slot ? (
        <section id="passo-dados" className="scroll-mt-24">
          <StepTitle number={showUpsell ? 5 : 4} title="Seus dados" />
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Seu nome"
                required
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 98765-4321"
                required
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
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observação (opcional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Alguma preferência?"
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
        </section>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {/* Resumo fixo + confirmação */}
      {serviceId ? (
        <div className="sticky bottom-3 z-30">
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--tenant-secondary)] p-3 pl-5 text-[var(--tenant-on-secondary)] shadow-xl shadow-black/25">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs opacity-70">
                {selectedService?.name}
                {slot
                  ? ` · ${timeFormat.format(new Date(slot))}`
                  : professionalId || firstAvailable
                    ? " · escolha o horário"
                    : " · escolha o profissional"}
                {cartItems.length ? ` · ${cartItems.length} produto(s)` : ""}
              </p>
              <p className="font-mono text-lg font-semibold">
                {currency.format(orderTotal)}
              </p>
            </div>
            <button
              type="submit"
              disabled={!slot || submitting}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-6 text-[15px] font-semibold text-[var(--tenant-on-primary)] transition-all not-disabled:hover:opacity-90 not-disabled:active:scale-[.98] disabled:opacity-40"
            >
              {submitting ? (
                <LoaderCircle className="size-4.5 animate-spin" />
              ) : (
                <CalendarCheck2 className="size-4.5" />
              )}
              Reservar
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function StepTitle({
  number,
  title,
  icon,
  optional = false,
}: {
  number: number;
  title: string;
  icon?: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--tenant-secondary)] text-xs font-semibold text-[var(--tenant-on-secondary)]">
        {number}
      </span>
      {icon}
      {title}
      {optional ? (
        <span className="text-xs font-normal opacity-45">opcional</span>
      ) : null}
    </h2>
  );
}

function QuantityButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full border border-black/15 transition-colors hover:bg-black/[.04] active:scale-[.95]"
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className="text-sm opacity-55">{label}</dt>
      <dd className="text-right text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
