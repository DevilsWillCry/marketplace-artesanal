import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getOrderDetails,
} from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { canViewOrdersMiddleware } from "../middleware/canViewOrders.middleware";

const router = Router();

//* RUTAS PÚBLICAS (sin middleware de autenticación) - Estas rutas no requieren autenticación
//* N/A - Todas las rutas de ordenes son protegidas por el middleware de autenticación

//* RUTAS PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.get("/", authMiddleware, getUserOrders); //* <- Ruta para obtener todos los productos
router.get("/:id", [authMiddleware, canViewOrdersMiddleware], getOrderDetails); //* <- Ruta para obtener el detalle de un pedido por ID

router.post("/", authMiddleware, createOrder); //* <- Ruta para crear un nuevo producto

export default router;
