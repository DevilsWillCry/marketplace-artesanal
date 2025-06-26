import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateReturnPeriod } from "../middleware/validateReturnPeriod.middleware";
import { requestReturn, updateReturnStatus, getReturnDetails, listReturns} from "../controllers/return.controller";
import { adminMiddleware } from "../middleware/admin.middleware";
import { canViewReturn } from "../middleware/canViewReturn";

const router = Router();


//* RUTAS PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.get("/", authMiddleware, listReturns); //* <- Ruta para obtener todas las devoluciones
router.post("/:id", [authMiddleware, validateReturnPeriod], requestReturn); //* <- Ruta para solicitar un devolución / user | admin
router.get("/:id", [authMiddleware, canViewReturn], getReturnDetails); //* <- Ruta para obtener el detalle de una devolución / user | admin
router.patch("/:returnId/order/:id",[authMiddleware, adminMiddleware], updateReturnStatus); //* <- Ruta para actualizar el estado de una devolución / admin

export default router;


