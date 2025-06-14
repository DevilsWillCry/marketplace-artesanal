import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { productAuthMiddleware } from "../middleware/product.auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { createProduct, getProducts, searchProducts, getProductById, updateProduct } from "../controllers/product.controller";


// * Definimos el enrutador
const router = Router();

//* RUTAS PÚBLICAS (sin middleware de autenticación) - Estas rutas no requieren autenticación
router.get("/", getProducts);            //* <- Ruta para obtener todos los productos
router.get("/search", searchProducts);   //* <- Ruta para buscar productos
router.get("/:id", getProductById);      //* <- Ruta para obtener un producto por ID

//* RUTAS PROTEGIDAS (con middleware de autenticación) - Estas rutas requieren autenticación
router.post("/", authMiddleware, createProduct);    //* <- Ruta para crear un nuevo producto
router.put("/:id", [authMiddleware, productAuthMiddleware], updateProduct);  //* <- Ruta para actualizar un producto


export default router;