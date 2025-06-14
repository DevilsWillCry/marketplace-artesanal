import { Router } from "express";
import { register, login, refreshToken, logout, logoutAll } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authLimiter, apiLimiter, refreshTokenLimiter, logoutAllLimiter } from "../utils/rateLimiter";

// * Definimos el enrutador
const router = Router();

// * Rutas PÚBLICAS (sin middleware de autenticación) - Estas rutas no requieren autenticación
router.post("/register", authLimiter, register);      //* <- Ruta para el registro de usuarios sin middleware de autenticación
router.post("/login", authLimiter, login);            //* <- Ruta para el inicio de sesión de usuarios sin middleware de autenticación

// * Rutas PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.post("/refresh-token", [refreshTokenLimiter, authMiddleware], refreshToken);//* <- Ruta para el refresco de tokens de acceso y actualización
router.post("/logout", authMiddleware, logout);                                    //* <- Ruta para el cierre de sesión
router.post("/logout-all", [logoutAllLimiter, authMiddleware], logoutAll);         //* <- Ruta para el cierre de sesión en todos los dispositivos

export default router;