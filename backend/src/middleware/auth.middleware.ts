import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { User } from "../models/user.model";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error("Token de autorización no proporcionado.");
    }

    // Verificar token y obtener usuario
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password -refreshTokens");
    console.log(user)

    if (!user) throw new Error("Usuario no encontrado.");

    req.user = user; // Agregar el id del usuario al objeto de solicitud
    next();
    
  } catch (error) {
    res
      .status(401)
      .json({
        message: "Acceso no autorizado.",
        details:
          error instanceof Error ? error.message : null,
      });
  }
};
