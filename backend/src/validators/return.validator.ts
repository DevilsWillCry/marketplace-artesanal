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
