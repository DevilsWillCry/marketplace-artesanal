import { Request, Response, NextFunction } from "express";
import { Order } from "../models/order.model";

export const canViewOrdersMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await Order.findById(req.params.id);
    const userId = req.user?._id;


    if (!order) {
      res.status(404).json({ error: "El pedido no fue encontrado" });
      return;
    }

    /*
        * Permitir acceso si:
        ? 1. Es el comprador, o
        ? 2. Es el artesano dueño del productor, o
        ? 3. El usuario es un administrador
        */
    const isBuyer = order.buyer.toString() === userId.toString();
    const isArtisan = order.items.some(
      (item) => item.artisan.toString() === userId.toString()
    );
    const isAdmin = req.user?.role === "admin";

    if (!isBuyer && !isArtisan && !isAdmin) {
      res.status(403).json({ error: "No tienes permiso para ver este pedido" });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al verificar permisos para ver el pedido" });
  }
};
