import { z } from "zod";
import { Request, Response } from "express";
import {
  CreateOrderSchema,
  GetOrderSchema,
} from "../validators/order.validator";
import { Order } from "../models/order.model";
import { Product } from "../models/product.model";
import { ProductIdSchema } from "../validators/product.validator";
import TokenPayload from "../models/interfaces/TokenPayload";
import { IUserObject } from "../models/interfaces/IUserObject";
import { IBuyerObject } from "../models/interfaces/IBuyerObject";

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
export const getUserOrders = async (req: Request, res: Response) => {
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
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    //* 1. Validar el ID
    const { id } = req.params;
    ProductIdSchema.parse(id); //* <-- Reutilizamos la validación de ID

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
    if (req.user?._id.toString() !== (order.buyer as unknown as IBuyerObject)._id.toString() && req.user?.role !== "admin") {
      console.log("ENTRO")
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
