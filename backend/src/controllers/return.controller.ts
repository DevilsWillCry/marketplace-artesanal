import { Request, Response } from "express";
import { z } from "zod";
import { ReturnOrderSchema } from "../validators/order.validator";
import { Order } from "../models/order.model";
import { addDays } from "date-fns";
import { UpdateReturnStatusSchema } from "../validators/return.validator";
import { Product } from "../models/product.model";
import { isValidObjectId, ObjectId } from "mongoose";

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
          "Algunos productos no perteneces al pedido o no tienen suficiente stock",
        invalidItems,
      });
      return;
    }

    //* 3. Crear solicitud de devolución
    const returnRequest = {
      requestedBy: req.user?._id,
      requestedAt: new Date(),
      status: "pending_preview", //* Estados: pending_preview | approved | rejected
      metadata: {
        ...validateData,
      },
    };

    //* 4. Actualizar el pedido
    await Order.findByIdAndUpdate(
      id,
      {
        $set: { returnRequest: returnRequest },
      },
      { new: true }
    );

    //* 5. Enviar notificaciones
    /*
     ? Enviar correo al comprador
     ? Enviar correo al artesano
     * await notifyArtisanAndAdmin(updatedOrder)
     */

    //* 6 Actualizar history del pedido
    await Order.findOneAndUpdate(
      { _id: id },
      {
        $push: {
          history: {
            typeReference: "return_request",
            status: "pending_preview",
            changedBy: req.user?._id,
            date: new Date(),
            metadata: returnRequest,
          },
        },
      },
      { new: true }
    );

    //* 7. Respuesta
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
    res.status(500).json({ error: "Error interno del servidor" });
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

    //* 2. Buscar el pedido y solicitud de devolución
    const order = await Order.findOne({
      _id: id,
      "returnRequest._id": returnId,
    });

    if (!order || !order.returnRequest) {
      res.status(404).json({ error: "Pedido o solicitud no encontrado" });
      return;
    }

    //* 3. Actualizar la solicitud de devolución
    const returnRequest = order.returnRequest;
    returnRequest.status = status;
    returnRequest.updatedAt = new Date();
    returnRequest.adminComment = adminComment;

    if (status === "refunded" && refundAmount) {
      //* Funcion para reembolsar
      returnRequest.refundAmount = refundAmount;
      //?   await processRefund(order.paymentId, refundAmount || returnRequest.total);
    }

    console.log(
      returnRequest.metadata.items.map((item: any) => item.productId)
    );

    console.log("Entro");
    //* 4. Revertir stock (si aplica)
    if (status === "approved") {
      console.log("Revirtiendo stock...");
      await Promise.all(
        returnRequest.metadata.items.map((item: Record<string, any>) => {
          if (item.productId && isValidObjectId(item.productId)) {
            return Product.findByIdAndUpdate(item.productId as ObjectId, {
              $inc: { stock: item.quantity },
            });
          } else {
            console.error(`Invalid productId: ${item.productId}`);
            return null;
          }
        })
      );
    }
    await order.save();
    console.log("Salio");

    //* 5. Notificar al usuario
    /*
     * await sendNotification({
     *    userId: order.buyer,
     *    type: "return_status_update",
     *   message: `Tu devolución #${returnId} ha sido ${status}`
     * });
     */

    //* 6 Actualizar history del pedido

    await Order.findOneAndUpdate(
      { _id: id },
      {
        $push: {
          history: {
            typeReference: "return_request",
            status: status,
            changedBy: req.user?._id,
            date: new Date(),
            metadata: returnRequest,
          },
        },
      },
      { new: true }
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
     res.status(500).json({ error: error instanceof Error ? error.message : "Error interno del servidor" });
  }
};
//! -------------------------------------------------------------------------------------------------------------- !//
