import { Router } from "express";
import { register, login, refreshToken } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

// * Definimos el enrutador
const router = Router();

// * Rutas PÚBLICAS (sin middleware de autenticación) - Estas rutas no requieren autenticación
router.post("/register", register);         //* <- Ruta para el registro de usuarios sin middleware de autenticación
router.post("/login",  login);              //* <- Ruta para el inicio de sesión de usuarios sin middleware de autenticación

// * Rutas PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.post("/refresh-token", authMiddleware, refreshToken); //* <- Ruta para el refresco de tokens de acceso y actualización

/*
router.post("/logout", authMiddleware, logout);             //* <- Ruta para el cierre de sesión
router.post("/logout-all", authMiddleware, logoutAll);      //* <- Ruta para el cierre de sesión en todos los dispositivos
 */

export default router;