import { Request, Response, NextFunction } from "express";
import { Order } from "../models/order.model";
import { addDays, isAfter } from "date-fns";

export const validateReturnPeriod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ error: " El pedido no fue encontrado" });
      return;
    }

    //* 1. Validar que el pedido haya sido entregado ("delivered")
    if (order.status !== "delivered") {
      res
        .status(400)
        .json({ error: "Solo pedidos entregados pueden ser devueltos" });
      return;
    }

    //* 2. Calcular fecha limite (7 dias despues de la entrega)
    const deliveryDate =
      order.history?.find((item: any) => item.status === "delivered")?.date ||
      order.createdAt;
    const returnDeadline = addDays(deliveryDate, 7);
    const today = new Date();

    //* 3. Verificar si está dentro del plazo
    if (isAfter(today, returnDeadline)) {
      res.status(400).json({
        error: "El plazo de devolución ha caducado",
        returnDeadline: returnDeadline.toISOString(),
        today: today.toISOString(),
      });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al verificar el plazo de devolución" });
  }
};
