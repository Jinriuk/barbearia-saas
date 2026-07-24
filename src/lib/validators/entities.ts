import { z } from "zod";

const uuid = z.uuid("Identificador inválido.");

export const serviceSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(0).max(999999),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  category: z.string().trim().max(60).optional(),
  imageUrl: z.union([z.url(), z.literal("")]).optional(),
  active: z.coerce.boolean().optional(),
  // Regra de público (Fase 0): serviço de assinante ou interno não aparece
  // na página nem no agendamento público.
  audience: z.enum(["public", "members", "internal"]).optional(),
  // Fallback do retorno previsto (Fase 3) quando o cliente tem pouco
  // histórico. Vazio = usa o padrão de 30 dias.
  returnDays: z.coerce.number().int().min(0).max(365).optional(),
  professionalIds: z.array(uuid).max(200).optional(),
});

export const professionalSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(500).optional(),
});

export const clientSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(30),
  email: z.union([z.email(), z.literal("")]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const appointmentSchema = z.object({
  clientId: uuid,
  professionalId: uuid,
  serviceId: uuid,
  startsAt: z.iso.datetime({ local: true }),
  notes: z.string().trim().max(1000).optional(),
});

export const publicBookingSchema = z.object({
  professionalId: uuid,
  serviceId: uuid,
  // A disponibilidade devolve timestamptz do Postgres (ex.: 2026-07-08T13:00:00+00:00),
  // que traz offset explícito. Sem { offset: true } o Zod rejeitava e a API respondia 400.
  startsAt: z.iso.datetime({ offset: true }),
  clientName: z.string().trim().min(2).max(100),
  clientPhone: z.string().trim().min(8).max(30),
  clientEmail: z.union([z.email(), z.literal("")]).optional(),
  notes: z.string().trim().max(500).optional(),
  products: z
    .array(
      z.object({
        productId: uuid,
        quantity: z.coerce.number().int().min(1).max(99),
      }),
    )
    .max(50)
    .optional(),
});
