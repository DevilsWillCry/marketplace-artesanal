import { Request, Response } from "express";
import { z } from "zod";
import { ReturnOrderSchema } from "../validators/order.validator";
import { Order } from "../models/order.model";
import { addDays } from "date-fns";
import {
  ListReturnsSchema,
  UpdateReturnStatusSchema,
} from "../validators/return.validator";
import { Product } from "../models/product.model";
import mongoose, { isValidObjectId, ObjectId } from "mongoose";

//! -------------------------------------------------------------------------------------------------------------- !//
//* Controlador para solicitar devolución
export const requestReturn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validadciones
    const { id } = req.params;
    const validateData = ReturnOrderSchema.parse(req.body);
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    //* 2. Verificar items a devolver
    const invalidItems = validateData.items.filter(
      (item) =>
        !order.items.some(
          (oi) =>
            oi.product.toString() === item.productId &&
            oi.quantity >= item.quantity
        )
    );

    if (invalidItems.length > 0) {
      res.status(400).json({
        error:
          "Algunos productos no pertenecen al pedido o no tienen suficiente stock",
        invalidItems,
      });
      return;
    }

    //* Validar si existe un pedido de devolución pendiente
    if (
      order.returnRequests?.some(
        (rr) => rr.status !== "rejected" || rr.status !== "refunded"
      )
    ) {
      res
        .status(400)
        .json({ error: "Ya existe una solicitud de devolución pendiente" });
      return;
    }

    //* 3. Crear solicitud de devolución
    const returnRequest = {
      requestedBy: req.user?._id,
      status: "pending_review", //* Estados: pending_review | approved | rejected
      metadata: {
        ...validateData,
      },
      history: [
        {
          status: "pending_review",
          changedBy: req.user?._id,
          date: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    //* 4. Actualizar el pedido
    await Order.findByIdAndUpdate(
      id,
      {
        $push: { returnRequests: returnRequest },
      },
      { new: true }
    );

    //* 5. Enviar notificaciones
    /*
     ? Enviar correo al comprador
     ? Enviar correo al artesano
     * await notifyArtisanAndAdmin(updatedOrder)
     */

    //* 6. Respuesta
    res.status(201).json({
      success: true,
      returnRequest,
      message: "Solicitud de devolución creada exitosamente",
      deadline: addDays(new Date(), 7).toISOString(), // Fecha limite para procesar la solicitud
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
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
      details: error,
    });
  }
};
//! -------------------------------------------------------------------------------------------------------------- !//

//! -------------------------------------------------------------------------------------------------------------- !//
//* Controlador para actualizar el estado de la devolución
export const updateReturnStatus = async (req: Request, res: Response) => {
  try {
    //* 1. Validar datos
    const { id, returnId } = req.params;
    const { status, adminComment, refundAmount } =
      UpdateReturnStatusSchema.parse(req.body);
    let refundAmountProduct = 0;

    //* 2. Buscar el pedido y solicitud de devolución
    const order = await Order.findOne({
      _id: id,
      "returnRequests._id": returnId,
    });

    if (!order || !order.returnRequests) {
      res.status(404).json({ error: "Pedido o solicitud no encontrado" });
      return;
    }

    //* 3. Actualizar la solicitud de devolución
    const returnRequest = order.returnRequests.find(
      (rr) => rr._id.toString() === returnId
    );

    if (!returnRequest) {
      res.status(404).json({ error: "Solicitud de devolución no encontrada" });
      return;
    }
    returnRequest.updatedAt = new Date();

    if (
      status === "refunded" &&
      refundAmount &&
      returnRequest.status === "approved"
    ) {
      //* Funcion para reembolsar
      //* 3.1. Buscar los productos y la cantidad que se reembolsará de la solicitud
      returnRequest.status = status;

      const products = returnRequest.metadata.items;

      for (const item of products) {
        const product = await Product.findById(item.productId);
        if (product) {
          refundAmountProduct += item.quantity * product.price;
        } else {
          console.error(`Invalid productId: ${item.productId}`);
          return;
        }
      }
      //?   await processRefund(order.paymentId, refundAmount || returnRequest.total);
    } else if (
      status === "approved" &&
      returnRequest.status === "pending_review"
    ) {
      returnRequest.status = status;
      console.log("Revirtiendo stock...");
      await Promise.all(
        returnRequest.metadata.items.map((item: Record<string, any>) => {
          if (item.productId && isValidObjectId(item.productId)) {
            return Product.findByIdAndUpdate(item.productId as ObjectId, {
              $inc: { stock: item.quantity },
            });
          } else {
            console.error(`Invalid productId: ${item.productId}`);
            return;
          }
        })
      );
    } else {
      res.status(400).json({
        error: `El reembolso no se puede realizar debido al estado de la solicitud de devolución (${returnRequest.status})`,
      });
      return;
    }

    await order.save();

    //* 5. Notificar al usuario
    /*
     * await sendNotification({
     *    userId: order.buyer,
     *    type: "return_status_update",
     *   message: `Tu devolución #${returnId} ha sido ${status}`
     * });
     */

    //* 6 Actualizar historiy del reembolso (returnRequests.history)
    await Order.findOneAndUpdate(
      { _id: id, "returnRequests._id": returnId },
      {
        $push: {
          "returnRequests.$.history": {
            status,
            comment: adminComment,
            refundAmount: refundAmountProduct,
            createdAt: new Date(),
          },
        },
      },
      {
        new: true,
      }
    );

    //* 7. Respuesta
    res.status(200).json({
      success: true,
      returnRequest,
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
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};
//! -------------------------------------------------------------------------------------------------------------- !//

//! -------------------------------------------------------------------------------------------------------------- !//
//* Controlador para obtener los detalles de una solicitud de devolución
export const getReturnDetails = async (req: Request, res: Response) => {
  try {
    const returnId = req.params.id;
    const order = await Order.findOne({
      "returnRequests._id": returnId,
    });

    if (!order || !order.returnRequests) {
      res.status(404).json({ error: "Solicitud de devolución no encontrada" });
      return;
    }

    const returnRequest = order.returnRequests.find(
      (rr) => rr._id.toString() === returnId
    );

    //* Datos adicionales (opcional)
    const populateOrder = await Order.populate(order, [
      {
        path: "buyer",
        select: "name email",
      },
      {
        path: "items.product",
        select: "name price images",
      },
      {
        path: "items.artisan",
        select: "name avatar shopName",
      },
    ]);

    //* 3. Respuesta
    res.status(200).json({
      success: true,
      returnInfo: {
        //...returnRequest,
        returnRequest,
        orderId: order._id,
        buyer: populateOrder.buyer,
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
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Error interno del servidor",
    });
  }
};
//! -------------------------------------------------------------------------------------------------------------- !//

//! -------------------------------------------------------------------------------------------------------------- !//
//* Controlador para listar las solicitudes de devolución
//TODO Mejorar este endpoint ya que no esta entregando los datos que debería.
export const listReturns = async (req: Request, res: Response) => {
  try {
    //* 1. Validar query params
    const { page, limit, status, fromDate, toDate, artisanId } =
      ListReturnsSchema.parse(req.query);
    const userId = req.user?._id;
    const isAdmin = req.user?.role === "admin";

    // Construir filtro para returnRequests
    const returnFilter: any = {};
    if (status) returnFilter["returnRequests.status"] = status;
    if (fromDate || toDate) {
      returnFilter["returnRequests.updatedAt"] = {};
      if (fromDate) returnFilter["returnRequests.updatedAt"].$gte = new Date(`${fromDate}T00:00:00Z`);
      if (toDate) returnFilter["returnRequests.updatedAt"].$lte = new Date(`${toDate}T23:59:59Z`);
    }

    // Filtro principal
    const orderFilter: any = { 
      ...returnFilter,
      "returnRequests": { $exists: true, $ne: [] } 
    };

    if (!isAdmin) {
      // Usuarios normales ven solo sus solicitudes
      orderFilter["returnRequests.requestedBy"] = userId;
    } else if (artisanId) {
      // Admins pueden filtrar por artesano
      orderFilter["items.artisan"] = new mongoose.Types.ObjectId(artisanId);
    }


    //* 3. Consulta con paginación (usando agregación para "desanidar" las solicitudes)
        const result = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$returnRequests" },
      { $match: isAdmin ? {} : { "returnRequests.requestedBy": userId } },
      { $sort: { "returnRequests.updatedAt": -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $lookup: {
          from: "users",
          localField: "buyer",
          foreignField: "_id",
          as: "buyer"
      }},
      { $unwind: "$buyer" },
      { $project: {
          returnId: "$returnRequests._id",
          status: "$returnRequests.status",
          reason: "$returnRequests.metadata.reason",
          requestedAt: "$returnRequests.createdAt",
          updatedAt: "$returnRequests.updatedAt",
          orderId: "$_id",
          total: "$total",
          buyer: {
              name: "$buyer.name",
              email: "$buyer.email"
          },
          items: {
              $map: {
                  input: "$items",
                  as: "item",
                  in: {
                      productId: "$$item.product",
                      quantity: "$$item.quantity",
                      price: "$$item.priceAtPurchase",
                  }
              }
          },
          history: "$returnRequests.history"
      }}
    ]);

    //* 4. Contar total (optimizado para esquema anidado)
    const total = await Order.aggregate([
      { $match: orderFilter },
      { $unwind: "$returnRequests" },
      ...(status ? [{ $match: { "returnRequests.status": status } }] : []),
      { $count: "total" }
    ]).then(res => res[0]?.total || 0);

    //* 5. Respuesta
    res.status(200).json({
      success: true,
      data: result,
      meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          isAdmin
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros",
        details: error.errors,
      });
      return;
    }
    res
      .status(500)
      .json({ error: "Error al listar devoluciones", details: error });
  }
};
//! -------------------------------------------------------------------------------------------------------------- !//
