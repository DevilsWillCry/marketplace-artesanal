import { z } from "zod";
import { Product } from "../models/product.model";

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().refine(
          (id) => {
            return /^[0-9a-fA-F]{24}$/.test(id);
          },
          {
            message: "ID de producto inválido",
          }
        ),
        quantity: z.number().int().positive(),
      })
    )
    .nonempty("El pedido debe tener al menos un producto"),
  shippingAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    country: z.string().min(2),
  }),
  paymentMethod: z.enum(["credit_card", "paypal", "cash_on_delivery"]),
});

export const GetOrderSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z
    .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
    .optional(),
});

export const UpdateOrderSchema = z
  .object({
    status: z.enum([
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]),
    trackingNumber: z.string().optional(),
    cancellationReason: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    // Validación condicional
    if (data.status === "shipped" && !data.trackingNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trackingNumber es requerido para envíos",
        path: ["trackingNumber"],
      });
    }
    if (data.status === "cancelled" && !data.cancellationReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cancellationReason es requerido para cancelaciones",
        path: ["cancellationReason"],
      });
    }
  });

export const ArtisanOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    status: z
      .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
      .optional(),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(), //* Formato YYYY-MM-DD
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (data) =>
      !(data.fromDate && data.toDate) ||
      new Date(data.fromDate) <= new Date(data.toDate),
    {
      message: "La fecha final debe ser >= a la inicial",
      path: ["fromDate"],
    }
  );

export const CancelOrderSchema = z.object({
  reason: z
    .string()
    .min(10)
    .max(500, "la razón debe ser menor a 500 caracteres"),
  refundRequest: z.boolean().optional(), //* Opcional para solicitar reembolso
});

export const ReturnOrderSchema = z
  .object({
    reason: z.string().min(10).max(500),
    evidencePhotos: z.array(z.string().url()).max(5).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().regex(/^[0-9a-fA-F]{24}$/),
          quantity: z.number().int().positive(),
          reason: z.string().min(10).max(500),
        })
      )
      .nonempty("El pedido debe tener al menos un producto"),
    refundMethod: z
      .enum(["original", "credit_card", "paypal", "cash_on_delivery"])
      .default("original"),
  })
  .refine((data) => data.items.every((item) => item.quantity > 0), {
    message: "La cantidad de productos devueltos debe ser mayor a cero",
    path: ["items"],
  });

//* Tipos TypeScript inferidos
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type GetOrderInput = z.infer<typeof GetOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type ArtisanOrderQueryInput = z.infer<typeof ArtisanOrdersQuerySchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type ReturnOrderInput = z.infer<typeof ReturnOrderSchema>;
