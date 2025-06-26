import { Request, Response, NextFunction } from "express";
import { Order } from "../models/order.model";

export const canViewReturn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const returnId = req.params.id;
        const order = await Order.findOne({
            "returnRequests._id": returnId
        })


        if(!order) {
            res.status(404).json({ error: "Solicitud de devolución no encontrada" });
            return;
        }

        /*
        * Permitir acceso si:
        ? 1. Es el comprador, o
        ? 2. Es el artesano dueño del productor, o
        ? 3. El usuario es un administrador
        */

        const isBuyer = order.buyer.toString() === req.user?._id.toString();
        const isArtisan = order.items.some((item) => item.artisan.toString() === req.user?._id.toString());
        const isAdmin = req.user?.role === "admin";

        if (!isBuyer && !isArtisan && !isAdmin) {
            res.status(403).json({ error: "No tienes permiso para ver este pedido" });
            return;
        }

        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al verificar permisos" });
    }
}