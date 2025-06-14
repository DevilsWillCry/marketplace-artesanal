import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user?.role !== "admin") {
      return res.status(401).json({ message: "Acceso no autorizado." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Error al verificar permisos" });
  }
};
