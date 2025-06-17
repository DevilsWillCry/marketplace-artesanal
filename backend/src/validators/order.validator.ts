import { z } from "zod";
import { Product } from "../models/product.model";

export const CreateOrderSchema = z
  .object({
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
    status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
  });

  
  //* Tipos TypeScript inferidos
  export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
  export type GetOrderInput = z.infer<typeof GetOrderSchema>;