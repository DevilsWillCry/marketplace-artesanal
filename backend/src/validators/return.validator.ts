import { z } from "zod";

export const UpdateReturnStatusSchema = z
  .object({
    status: z.enum(["pending_review", "approved", "rejected", "refunded"]),
    adminComment: z.string().max(500).optional(), //* Comentario interno/revisión
    refundAmount: z.number().positive().optional(), //* Para reembolsos parciales
  })
  .refine(
    (data) => {
      if (data.status === "refunded" && !data.refundAmount) {
        return false;
      }
      return true;
    },
    {
      message: "refoundAmount es requerido para reembolsos parciales",
      path: ["refundAmount"],
    }
  );

export const ListReturnsSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: z
      .enum(["pending_review", "approved", "rejected", "refunded"])
      .optional(),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(), // YYYY-MM-DD
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    artisanId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(), // Filtro para admins
  })
  .refine(
    (data) =>
      !(data.fromDate && data.toDate) ||
      new Date(data.fromDate) <= new Date(data.toDate),
    {
      message: "La fecha inicial no puede ser mayor a la final",
      path: ["fromDate"],
    }
  );
