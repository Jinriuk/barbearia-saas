"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { PublicProfessional, PublicService } from "@/types/domain";
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

export function BookingForm({
  tenant,
  services,
  professionals,
}: {
  tenant: string;
  services: PublicService[];
  professionals: PublicProfessional[];
}) {
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
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

  if (success)
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h2 className="mt-5 text-2xl font-semibold">Horário solicitado</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            A barbearia recebeu sua reserva. Guarde o dia e o horário
            escolhidos.
          </p>
        </CardContent>
      </Card>
    );

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
                    {service.name} · R$ {Number(service.price).toFixed(2)}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Seus dados</CardTitle>
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
