import { Router } from "express";
import { register, login, refreshToken } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Rutas PÚBLICAS (sin middleware de autenticación)
router.post("/register", register); // <- Ruta para el registro de usuarios sin middleware de autenticación
router.post("/login",  login); // <- Ruta para el inicio de sesión de usuarios sin middleware de autenticación

// Rutas PROTEGIDAS (con middleware de autenticación)
router.get("/refresh-token", authMiddleware, refreshToken);
router.post("/logout", authMiddleware);
router.post("/logout-all", authMiddleware);


export default router;