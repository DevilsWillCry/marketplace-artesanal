// src/middleware/product.auth.middleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { Product } from "../models/product.model";

export const productAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //* 1. Obtenemos el usuario autenticado del authMiddleware
    const user = req.user;

    //* 2. Obtenemos el producto del usuario (si existe o es del usuario)
    const product = await Product.findById(req.params.id);

    if (
      product?.artisan?.toString() !== user?._id.toString() &&
      user?.role !== "admin"
    ) {
      res
        .status(401)
        .json({ message: "No tienes permisos para editar/eliminar este producto" });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al verificar permisos" });
  }
};
