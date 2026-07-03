"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import type {
  PublicProduct,
  PublicProfessional,
  PublicService,
} from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getLocalDateInputValue } from "@/lib/dates";

type Slot = { starts_at: string; ends_at: string };
type Cart = Record<string, number>;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function BookingForm({
  tenant,
  services,
  professionals,
  products,
  isPlus,
}: {
  tenant: string;
  services: PublicService[];
  professionals: PublicProfessional[];
  products: PublicProduct[];
  isPlus: boolean;
}) {
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const availableProfessionals = useMemo(
    () =>
      professionals.filter(
        (item) => !serviceId || item.serviceIds.includes(serviceId),
      ),
    [professionals, serviceId],
  );
  const today = getLocalDateInputValue();
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

  async function loadSlots() {
    if (!serviceId || !professionalId || !date) return;
    setLoading(true);
    setMessage("");
    setSlot("");
    const query = new URLSearchParams({ serviceId, professionalId, date });
    const response = await fetch(`/api/public/${tenant}/availability?${query}`);
    const result = (await response.json()) as {
      slots?: Slot[];
      error?: string;
    };
    setSlots(result.slots ?? []);
    setMessage(result.error ?? "");
    setLoading(false);
  }

  async function submit(formData: FormData) {
    if (!slot) return;
    setLoading(true);
    setMessage("");
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
    const result = (await response.json()) as { ok?: boolean; error?: string };
    setLoading(false);
    if (result.ok) setSuccess(true);
    else {
      setMessage(result.error ?? "Não foi possível reservar.");
      await loadSlots();
    }
  }

  if (success) {
    const slotDate = slot ? new Date(slot) : null;
    return (
      <Card className="overflow-hidden">
        <div className="bg-emerald-50 px-6 py-10 text-center dark:bg-emerald-950/30">
          <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Horário reservado com sucesso!
          </h2>
          <p className="mt-1 text-emerald-700 dark:text-emerald-400">
            Aguardo você!
          </p>
        </div>
        <CardContent className="space-y-4 py-6">
          <p className="text-muted-foreground text-center text-sm">
            Guarde os detalhes da sua reserva:
          </p>
          <dl className="divide-y rounded-xl border">
            <SummaryRow label="Serviço" value={selectedService?.name ?? "—"} />
            <SummaryRow
              label="Profissional"
              value={selectedProfessional?.name ?? "—"}
            />
            {slotDate ? (
              <>
                <SummaryRow
                  label="Data"
                  value={new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  }).format(slotDate)}
                />
                <SummaryRow
                  label="Horário"
                  value={new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(slotDate)}
                />
              </>
            ) : null}
            {cartItems.map((item) => (
              <SummaryRow
                key={item.product.id}
                label={`${item.product.name} × ${item.quantity}`}
                value={currency.format(item.product.price * item.quantity)}
              />
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm font-semibold">Total</dt>
              <dd className="font-mono text-base font-semibold">
                {currency.format(orderTotal)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={submit} className="space-y-5">
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Escolha o atendimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select
              value={serviceId}
              onValueChange={(value) => {
                setServiceId(value);
                setProfessionalId("");
                setSlots([]);
              }}
            >
              <SelectTrigger aria-label="Serviço">
                <SelectValue placeholder="Escolha o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} · {currency.format(Number(service.price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select
              value={professionalId}
              onValueChange={(value) => {
                setProfessionalId(value);
                setSlots([]);
              }}
              disabled={!serviceId}
            >
              <SelectTrigger aria-label="Profissional">
                <SelectValue placeholder="Escolha quem atende" />
              </SelectTrigger>
              <SelectContent>
                {availableProfessionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlots([]);
              }}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={loadSlots}
              disabled={loading || !date || !professionalId}
            >
              {loading ? <LoaderCircle className="animate-spin" /> : null} Ver
              horários
            </Button>
          </div>
          {slots.length ? (
            <div className="sm:col-span-2">
              <Label>Horário</Label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((item) => (
                  <Button
                    key={item.starts_at}
                    type="button"
                    variant={slot === item.starts_at ? "default" : "outline"}
                    onClick={() => setSlot(item.starts_at)}
                  >
                    {new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.starts_at))}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showUpsell ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="size-4" /> 2. Quer levar um produto?
            </CardTitle>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles className="size-3.5" /> Selecionados especialmente pela
              barbearia.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const quantity = cart[product.id] ?? 0;
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {product.description || "Produto da casa"}
                    </p>
                    <p className="text-primary mt-1 font-mono text-sm">
                      {currency.format(Number(product.price))}
                    </p>
                  </div>
                  {quantity > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Remover ${product.name}`}
                        onClick={() => removeProduct(product.id)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center font-mono text-sm">
                        {quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Adicionar ${product.name}`}
                        onClick={() => addProduct(product.id)}
                      >
                        <Plus />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addProduct(product.id)}
                    >
                      <Plus /> Adicionar
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {showUpsell ? "3." : "2."} Seus dados
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">E-mail (opcional)</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Observação (opcional)</Label>
            <Textarea id="notes" name="notes" />
          </div>
          {slot ? (
            <div className="bg-muted/40 flex items-center justify-between rounded-lg border px-4 py-3 sm:col-span-2">
              <span className="flex items-center gap-2 text-sm">
                <Clock3 className="size-4" />
                {selectedService?.name}
                {cartItems.length ? ` + ${cartItems.length} produto(s)` : ""}
              </span>
              <span className="font-mono text-sm font-semibold">
                {currency.format(orderTotal)}
              </span>
            </div>
          ) : null}
          <Button
            className="sm:col-span-2"
            size="lg"
            disabled={!slot || loading}
          >
            {loading ? <LoaderCircle className="animate-spin" /> : null}{" "}
            Confirmar agendamento
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground text-sm capitalize">{label}</dt>
      <dd className="text-right text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
