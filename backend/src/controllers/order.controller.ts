import { z } from "zod";
import { Request, Response } from "express";
import {
  CancelOrderSchema,
  CreateOrderSchema,
  GetOrderSchema,
  ReturnOrderSchema,
  UpdateOrderSchema,
} from "../validators/order.validator";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import TokenPayload from "../models/interfaces/TokenPayload";
import { IUserObject } from "../models/interfaces/IUserObject";
import { IBuyerObject } from "../models/interfaces/IBuyerObject";
import { addDays } from "../utils/dateHelpers";
import { ObjectIdSchema } from "../validators/id.validator";
import { generateTrackingData } from "../utils/generateTrackingData";

//* Controlador para crear un nuevo pedido
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar datos de entrada.
    const validatedData = await CreateOrderSchema.parseAsync(req.body);

    const buyerId = req.user?._id;

    //* 2. Obtener detalles de los productos y calcular total.
    // Validación de stock y estado del producto
    for (const item of validatedData.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(404).json({
          success: false,
          message: `Producto con ID ${item.productId} no encontrado`,
        });
        return;
      }
      if (!product.isActive) {
        res.status(400).json({
          success: false,
          message: `El producto con ID ${item.productId} no está activo`,
        });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Stock insuficiente para el producto con ID ${item.productId}`,
        });
        return;
      }
    }

    const itemsWithDetails = await Promise.all(
      validatedData.items.map(async (item) => {
        const product = await Product.findById(item.productId);
        // Aquí ya está validado que existe, tiene stock y está activo
        return {
          product: item.productId,
          quantity: item.quantity,
          priceAtPurchase: product!.price, //* Precio al momento de la compra
          artisan: product!.artisan, //* Para notificaciones
        };
      })
    );

    //* 3. Calcular el total del pedido.
    const total = itemsWithDetails.reduce(
      (acc, item) => acc + item.priceAtPurchase * item.quantity,
      0
    );

    //* 4. Crear el pedidod en la base de datos
    const newOrder = await Order.create({
      buyer: buyerId,
      items: itemsWithDetails,
      total,
      shippingAddress: validatedData.shippingAddress,
      paymentMethod: validatedData.paymentMethod,
      status: "pending", //* Estado inicial
    });

    //* 5. Actualizar el stock de los productos
    await Promise.all(
      itemsWithDetails.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Producto con ID ${item.product} no encontrado`);
        }
        product.stock -= item.quantity;
        await product.save();
      })
    );

    //* 6. Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Pedido creado exitosamente",
      data: newOrder,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
  }
};

//* Controlador para obtener los pedidos de un usuario
export const getUserOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar query params.
    const { page, limit, status } = await GetOrderSchema.parseAsync(req.query); //* Validar los query params con Zod
    const userId = req.user?._id; //* Obtiene el id del authMiddleware

    //* 2. Crear filtro (solo pedidos del usuario).
    const filter: any = {
      buyer: userId,
    };
    if (status) filter.status = status; //* <-- Solo productos de la categoria

    //* 3. Consulta con paginación
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 }) // Más recientes primero
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("items.product", "name images") // Datos básicos del producto
      .populate("items.artisan", "name avatar"); // Datos básicos del artesano

    //* 4. Total de productos (por paginación)
    const total = await Order.countDocuments(filter);

    //* 5. Respuesta
    res.json({
      success: true,
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
  }
};

//* Controlador para obtener los detalles de un pedido
export const getOrderDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar el ID
    const { id } = req.params;
    ObjectIdSchema.parse(id);

    //* 2. Buscar el pedido con datos poblados
    const order = await Order.findById(id)
      .populate("buyer", "name email") // Datos básicos del comprador
      .populate("items.product", "name price images") // Productos del pedido
      .populate("items.artisan", "name avatar shopName"); // Artesano

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    //* 3. Filtrar los items del pedido para el artesano
    if (
      req.user?._id.toString() !==
        (order.buyer as unknown as IBuyerObject)._id.toString() &&
      req.user?.role !== "admin"
    ) {
      order.items = order.items.filter((item) => {
        const artisan = item.artisan as unknown as IUserObject;
        return req.user?._id.toString() === artisan._id.toString();
      });
    }

    //* 3. Respuesta estructurada
    res.json({
      success: true,
      data: {
        ...order.toJSON(),
        //Datos calculado opcional.
        totalItems: order.items.reduce((acc, item) => acc + item.quantity, 0),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
  }
};

//* Controlador para actualizar el estado de un pedido
export const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar el ID
    const { id } = req.params;
    ObjectIdSchema.parse(id);
    const { status, trackingNumber, cancellationReason } =
      UpdateOrderSchema.parse(req.body);

    //* 2. Validar transicion de estado valida
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const validTransitions: Record<string, string[]> = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    console.log(
      "order.status:",
      order.status,
      "status body:",
      status,
      "conditional:",
      !validTransitions[order.status]?.includes(status)
    );

    if (!validTransitions[order.status]?.includes(status)) {
      res.status(400).json({
        error: `Transición de estado no valida: ${order.status} -> ${status}`,
        allowedTransitions: validTransitions[order.status] || [],
      });
      return;
    }

    if (status === "cancelled") {
      await Product.updateMany(
        { _id: { $in: order.items.map((item) => item.product) } },
        { $inc: { stock: order.items.length } }
      );
    }

    //* 3. Actualizar el pedido
    const update: any = {
      $set: {
        status: status,
        ...(trackingNumber && { trackingNumber }),
      },
      $push: {
        history: {
          typeReference: "order",
          status,
          changedBy: req.user._id,
          date: new Date(),
          metadata: cancellationReason ? { cancellationReason } : {},
        },
      },
    };

    //* actualizar el pedido
    const updatedOrder = await Order.findByIdAndUpdate(id, update, {
      new: true,
    });

    //* 4. Notificar al comprador (ejemplo simplificado)
    if (status === "shipped") {
      /*
       * Enviar un correo al comprador con el tracking number
        if (status === "shipped") {
        await sendNotificationToBuyer(
          order.buyer,
          `Tu pedido #${id} ha sido enviado. Tracking: ${trackingNumber}`
        );
        }
       */
    }

    //* 5. Respuesta
    res.json({
      success: true,
      message: "Estado del pedido actualizado",
      data: updatedOrder,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
  }
};

//* Controlador para cancelar un pedido
export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validaciones
    const { id } = req.params;
    const { reason, refundRequest } = CancelOrderSchema.parse(req.body);
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    //* 2 Revertir stock (si aplica)
    if (["pending", "processing"].includes(order.status)) {
      order.items.map((item: any) => {
        Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      });
    }

    //* 3. Actualizar el pedido
    const updateOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "cancelled",
          cancellationReason: reason,
        },
        $push: {
          history: {
            typeReference: "order",
            status: "cancelled",
            changedBy: req.user._id,
            date: new Date(),
            metadata: { cancellationReason: reason },
          },
        },
      },
      { new: true }
    ).populate("buyer", "name email");

    //* 4. Notificar al comprador (ejemplo simplificado)
    /*
        await sendNotification({
      to: updatedOrder.buyer.email,
      subject: "Pedido cancelado",
      message: `Tu pedido #${id} ha sido cancelado. Razón: ${reason}`
    });

    */

    //* 5. Iniciar reembolso si fue solicitado (ejemplo con Stripe)
    /*
    if (refundRequest && order.paymentMethod !== "cash_on_delivery") {
      await processRefund(order.paymentId, order.total);
    }
    */

    //* 6. Respuesta
    res.json({
      success: true,
      message: "Pedido cancelado",
      order: updateOrder?.history
        ? updateOrder.history[updateOrder.history.length - 1]
        : null,
      refundInitiated: refundRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
  }
};

//* Controlador para obtener el seguimiento de un pedido
export const getOrderTracking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar ID.
    const { id } = req.params;
    ObjectIdSchema.parse(id);

    //* 2. Buscar pedido con datos esenciales
    const order = await Order.findById(id)
      .select("status trackingNumber shippingAddress items.artisan")
      .populate("items.artisan", "shopName");

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    if (!["shipped", "delivered"].includes(order.status)) {
      res
        .status(400)
        .json({ error: "El pedido aún no ha sido enviado ni entregado" });
      return;
    }

    if (!order.trackingNumber) {
      res
        .status(400)
        .json({ error: "El pedido no tiene número de seguimiento asignado" });
      return;
    }

    //* 3. Simular datos de seguimiento (o integrar con API real)
    const trackingData = await generateTrackingData(order);

    //* 4. Respuesta
    res.json({
      success: true,
      tracking: {
        number: order.trackingNumber,
        carrier: "FedEx",
        estimateDelivery: trackingData.estimateDelivery,
        history: trackingData.history,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


