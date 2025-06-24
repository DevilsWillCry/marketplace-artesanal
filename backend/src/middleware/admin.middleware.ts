import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (user?.role !== "admin") {
      res.status(403).json({ error: "No tienes permiso para realizar esta accion" });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Error al verificar permisos" });
    return;
  }
};
