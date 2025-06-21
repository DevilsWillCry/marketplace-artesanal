import { Request, Response, NextFunction } from "express";
import { Order } from "../models/order.model";

export const userAuthOrderMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    /*
     * Permitir si:
     * 1. Es el vendedor, o
     * 2. El usuario es un administrador
     */
    const order = await Order.findById(req.params.id);
    const userId = req.user?._id.toString();

    if (!order) {
      res.status(404).json({ error: "El pedido no fue encontrado" });
      return;
    }

    const isArtisan = order.items.some(
      (item) => item.artisan.toString() === userId.toString()
    );
    const isAdmin = req.user?.role === "admin";

    if (!isArtisan && !isAdmin) {
      res
        .status(403)
        .json({
          error: "No tienes permiso para actualizar el estado del pedido",
        });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al verificar permisos" });
  }
};
