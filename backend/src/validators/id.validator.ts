import { z } from "zod";

//* Validación de ID
export const ObjectIdSchema = z.string().refine(
  (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },
  {
    message: "ID de producto inválido",
  }
);