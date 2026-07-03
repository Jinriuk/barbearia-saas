import { z } from "zod";

const uuid = z.uuid("Identificador inválido.");

export const serviceSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(0).max(999999),
  durationMinutes: z.coerce.number().int().min(5).max(720),
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
  startsAt: z.iso.datetime(),
  clientName: z.string().trim().min(2).max(100),
  clientPhone: z.string().trim().min(8).max(30),
  clientEmail: z.union([z.email(), z.literal("")]).optional(),
  notes: z.string().trim().max(500).optional(),
});
