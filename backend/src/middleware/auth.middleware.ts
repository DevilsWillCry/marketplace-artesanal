//* src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { User } from "../models/user.model";


//* Middleware de autenticación
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    //* 1. Obtener token del header de la solicitud
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res
        .status(401)
        .json({ message: "Acceso no autorizado", details: null });
      return;
    }
    //* 2. Verificar token y obtener usuario
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password -refreshTokens");

    if (!user) throw new Error("Usuario no encontrado.");

    //* 3. Agregar usuario al objeto de solicitud

   req.user = user;
   next();

    
  } catch (error) {
    res
      .status(401)
      .json({
        message: "Token invalido.",
        details:
          error instanceof Error ? error.message : null,
      });
  }
};
