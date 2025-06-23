import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getOrderDetails,
  updateOrderStatus,
  cancelOrder,
  getOrderTracking,
  requestReturn,
} from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { canViewOrdersMiddleware } from "../middleware/canViewOrders.middleware";
import { userAuthOrderMiddleware } from "../middleware/user.admin.auth.order";
import { canCancelOrder } from "../middleware/canCancelOrder.middleware";
import { validateReturnPeriod } from "../middleware/validateReturnPeriod.middleware";

const router = Router();

//* RUTAS PÚBLICAS (sin middleware de autenticación) - Estas rutas no requieren autenticación
//* N/A - Todas las rutas de pedidos son protegidas por el middleware de autenticación

//* RUTAS PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.post("/", authMiddleware, createOrder); //* <- Ruta para crear un nuevo pedido
router.get("/:id", [authMiddleware, canViewOrdersMiddleware], getOrderDetails); //* <- Ruta para obtener el detalle de un pedido por ID
router.get("/", authMiddleware, getUserOrders); //* <- Ruta para obtener todos los pedidos
router.patch("/:id/status", [authMiddleware, userAuthOrderMiddleware], updateOrderStatus); //* <- Ruta para actualizar el estado de un pedido
router.get("/:id/tracking", [authMiddleware, canViewOrdersMiddleware], getOrderTracking); //* <- Ruta para obtener el seguimiento de un pedido
router.post("/:id/cancel", [authMiddleware, canCancelOrder], cancelOrder); //* <- Ruta para cancelar un pedido
router.post("/:id/return", [authMiddleware, validateReturnPeriod], requestReturn); //* <- Ruta para solicitar un devolución

export default router;
