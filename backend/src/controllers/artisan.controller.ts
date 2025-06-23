import { Request, Response } from "express";
import { ArtisanOrdersQuerySchema } from "../validators/order.validator";
import { Order } from "../models/order.model";
import { z } from "zod";

export const getArtisanOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* Validar query params
    const { page, limit, status, fromDate, toDate } =
      ArtisanOrdersQuerySchema.parse(req.query);
    const artisanId = req.user?._id; // ID del artesano autenticado

    //* 1. Crear filtro
    const filter: any = {
      "items.artisan": artisanId, // Solo pedidos con sus productos
      ...(status && { status }),
    };

    //* 2. Filtrar por rango de fechas
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(`${fromDate}T00:00:00Z`);
      if (toDate) filter.createdAt.$lte = new Date(`${toDate}T23:59:59Z`);
    }

    //* 3. Consulta con paginación
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 }) // Más recientes primero
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("buyer", "name email") // Datos del comprador
      .populate("items.product", "name price images"); // Productos

    //* 4. filtrar los items del pedido para el artesano
    const filteredOrders = orders.map((order) => {
      const filteredItems = order.items.filter(
        (item: any) => item.artisan.toString() === artisanId.toString()
      );
      return {
        ...order.toObject(),
        items: filteredItems,
      };
    });

    //* 5. Total de pedidos (por paginación) 
    const total = await Order.countDocuments(filter);

    //* 6. Calcular métricas útiles (opcional)
    const artisanRevenue = await Order.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      { $match: { "items.artisan": artisanId } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $multiply: ["$items.priceAtPurchase", "$items.quantity"],
            },
          },
        },
      },
    ]).then((res) => res[0]?.total || 0);

    //* 7. Respuesta
    res.json({
      success: true,
      data: filteredOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        ...artisanRevenue,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros",
        details: error.errors,
      });
      return;
    }
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
};
