import express from "express";
import { Request, Response, NextFunction } from "express";

import { config } from "dotenv";

import { connectDB, dbStatus } from "./config/database";

import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";

import cookieParser from "cookie-parser";

// Cargar variables de entorno de .env
config();

// Puerto de la API (3000 por defecto)
const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Crear una instancia de express
const app = express();

//* Middleware para parsear JSON
app.use(express.json());

//* Middleware para parsear cookies
app.use(cookieParser());

//* Configuración de CORS para permitir solicitudes desde cualquier origen
app.set("trust proxy", 1);

//Rutas de la API - Auth Usuarios - Productos
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

//* Ruta de prueba
app.get("/", async (req: Request, res: Response) => {
  const dbState = dbStatus() == 1 ? "connected" : "disconnected";
  res
    .status(200)
    .setHeader("Content-Type", "application/json")
    .json({
      message: "API funcionando",
      database: dbState,
      data: {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    });
});

app.get("/error-test", (req: Request, res: Response) => {
  throw new Error("¡Esto es una prueba de error!");
});

// Ruta no encontrada (404)
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .setHeader("Content-Type", "application/json")
    .json({
      error: "Ruta no encontrada",
      data: {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    });
});

// Manejo de errores global
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof Error) {
    console.error("[❌ ERROR]", err.message, "\nStack:", err.stack);
    res
      .status(500)
      .setHeader("Content-Type", "application/json")
      .json({
        error: "Error interno del servidor",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    return;
  }
  res.status(500).setHeader("Content-Type", "application/json").json({
    error: "Error desconocido",
  });
});

// Iniciar el servidor en el puerto 3000
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🟢 Servidor corriendo en http://localhost:${PORT}`);
  });
});

// Manejo de errores en el servidor (escuchando el puerto)
app.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      "El puerto 3000 ya está en uso. Por favor, elija otro puerto."
    );
    process.exit(1); // Detiene el servidor
  } else {
    console.error("Ocurrió un error al iniciar el servidor:", err);
  }
});
