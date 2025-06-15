import { z } from "zod";
import { Product } from "../models/product.model";

//* Helper para validar ObjectId de Mongoose
const isValidObjectId = (value: string) =>
  z.string().uuid().safeParse(value).success;

//* Validación de campos de producto alineado con IProduct
const ProductBaseSchema = z.object({
  name: z
    .string()
    .min(3, "Nombre muy corto (mín. 3 caracteres)")
    .max(100, "Nombre muy largo (máx. 100 caracteres)"),
  description: z
    .string()
    .min(10, "Descripción muy corta (mín. 10 caracteres)")
    .max(500, "Descripción muy larga (máx. 500 caracteres)"),
  price: z
    .number()
    .positive("El precio debe ser positivo")
    .max(10000, "Precio demasiado alto (máx. $10,000)"), // Ajusta según tu lógica
  stock: z
    .number()
    .int("El stock debe ser un entero")
    .min(0, "El stock no puede ser negativo"),
  category: z.string().min(1, "Categoría requerida"),
  artisan: z.string(),
  images: z
    .array(z.string().url("URL de imagen inválida"))
    .max(5, "Máximo 5 imágenes permitidas")
    .optional(),
  isActive: z.boolean().optional(), // Opcional porque tiene valor por defecto
});

//* Creación: Hacemos 'images' requerido y omitimos 'isActive' porque se asigna por defecto en el modelo.
export const CreateProductSchema = ProductBaseSchema.omit({
  isActive: true,
}).extend({
  images: z.array(z.string().url()).nonempty("Las imágenes son requeridas"),
});

//* Actualización: Todos los campos opcionales + validación extra
export const UpdateProductSchema = ProductBaseSchema.partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar",
  })
  .refine((data) => !data.price || data.price > 0, {
    message: "El precio debe ser mayor a cero",
    path: ["price"],
  });

//* Filtros para consultas (GET/products)
export const ProductQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    category: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(["price", "-price", "createdAt", "-createdAt"]).optional(),
  })
  .refine(
    (data) =>
      !(data.maxPrice && data.minPrice) || data.maxPrice >= data.minPrice,
    {
      message: "El precio máximo debe ser >= al mínimo",
    }
  );

//* Validación de busqueda
export const ProductSearchSchema = z.object({
  query: z.string().min(3, "La consulta debe tener al menos 3 caracteres"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  //* Opcional: agregar filtros adicionales (ej. categoría, precio, etc.)
  category: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

//* Validación de ID
export const ProductIdSchema = z.string().refine(
  (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },
  {
    message: "ID de producto inválido",
  }
);

//* Validación de producto por artesano
export const ArtisanProductSchema = z.object({
  artisanId: z.string().refine((id) => /^[0-9a-fA-F]{24}$/.test(id), {
    message: "ID de artesano inválido",
  }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  category: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

//*
export const AdjustStockSchema = z
  .object({
    operation: z.enum(["increment", "decrement", "set"]), //* Tipo de operación
    value: z.number().int().min(0), //* Valor de la operación
    reason: z.string().min(3).max(100).optional(), //* Ej. "Venta", "Reposición", etc
  })
  .refine(
    (data) => {
      //* validar que 'value' sea positivo si es 'set'
      if (data.operation === "set" && data.value <= 0) return false;
      return true;
    },
    {
      message: "El valor debe ser positivo si la operación es 'set'",
      path: ["value"],
    }
  );

//* Tipos TypeScript inferidos
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;
export type ProductSearchInput = z.infer<typeof ProductSearchSchema>;
export type ProductIdInput = z.infer<typeof ProductIdSchema>;
export type ArtisanProductInput = z.infer<typeof ArtisanProductSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
