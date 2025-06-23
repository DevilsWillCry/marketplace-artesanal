import { Request, Response, NextFunction } from "express";
import { Order } from "../models/order.model";

export const canCancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const order = await Order.findById(req.params.id);
  const userId = req.user?._id.toString();

  if (!order) {
    res.status(404).json({ error: "El pedido no fue encontrado" });
    return;
  }

  
  const isAdmin = req.user?.role === "admin";
  const isBuyer = order.buyer.toString() === userId.toString();
  const isCancellable = ["pending", "processing"].includes(order.status);
  const isWithinCancellationPeriod = new Date(order.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas en milisegundos
  
  if (!isAdmin || !isWithinCancellationPeriod) {
    res.status(403).json({ error: "Solo puedes cancelar pedidos dentro de las 24 horas" });
    return;
  }
  
  if ((!isBuyer && !isAdmin) || (!isCancellable && !isAdmin)) {
    res
      .status(403)
      .json({ error: "No tienes permiso para cancelar este pedido" });
    return;
  }
  next();
};
