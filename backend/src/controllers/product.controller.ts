// controllers/product.controller.ts
import { Request, Response } from "express";
import { ProductService } from "../services/product.service";
import { ProductRepository } from "../repositories/product.repository";
import {
  CreateProductSchema,
  ProductQuerySchema,
  ProductSearchSchema,
  ProductIdSchema,
  UpdateProductSchema,
} from "../validators/product.validator";
import { z } from "zod";
import { Product } from "../models/product.model";

const productRepository = new ProductRepository();
const productService = new ProductService(productRepository);

//* Controlador para crear un nuevo producto
export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validationData = {
      ...req.body,
      artisan: req.user?._id.toString(),
    };

    const productParsed = await CreateProductSchema.parseAsync(validationData);

    const product = await productService.createProduct(productParsed);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Error desconocido",
      details: error instanceof z.ZodError ? error.errors : undefined,
    });
  }
};

//* Controlador para obtener todos los productos
export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar los query params con Zod
    //? Ahora validatedQuery tiene los valores ya validados y con valores por defecto
    const validatedQuery = ProductQuerySchema.parse(req.query);

    //* 2. Crear filtros (usando los valores validados)
    const filter: any = { isActive: true };
    const { category, minPrice, maxPrice, sort } = validatedQuery;

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice; // ¡Ya es number gracias a Zod!
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    //* 3. Consulta con paginación (usando page y limit validados)
    const products = await Product.find(filter)
      .sort(sort || "-createdAt")
      .skip((validatedQuery.page - 1) * validatedQuery.limit)
      .limit(validatedQuery.limit)
      .populate("artisan", "name");

    //* 4. Total de documentos
    const total = await Product.countDocuments(filter);

    //* 5. Respuesta
    res.json({
      data: products,
      pagination: {
        total,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages: Math.ceil(total / validatedQuery.limit),
      },
    });
  } catch (error) {
    //* Manejo de errores de Zod
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
      return;
    }
    //* Otros errores (ej: conexión a DB)
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//* Controlador para buscar productos
export const searchProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar los query params con Zod
    const { query, page, limit, category, minPrice, maxPrice } =
      ProductSearchSchema.parse(req.query);

    //* 2. Crear filtro (solo productos activos + busqueda)
    const filter: any = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: "i" } }, // 'i' para case-insensitive
        { description: { $regex: query, $options: "i" } },
      ],
    };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice; // ¡Ya es number gracias a Zod!
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    //* 3. Consulta con paginación (usando page y limit validados)
    const products = await Product.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("artisan", "name avatar");

    //* 4. Total de resultados
    const total = await Product.countDocuments(filter);

    //* 5. Respuesta
    res.json({
      data: products,
      pagination: {
        query, // Termino buscado (por si se necesita en el front)
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//* Controlador para obtener un producto por ID
export const getProductById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar el ID
    const { id } = req.params; //* <-- obtiene el id de la url
    const validatedId = ProductIdSchema.parse(id); //* <-- Lanza un error si no es valido

    //* 2. Buscar el producto (activo) + datos del artesano
    const product = await Product.findOne({ _id: validatedId, isActive: true })
      .populate("artisan", "name avatar") //* <-- Datos relevantes del artesano
      .lean(); //* <-- Devuelve un objeto plano (sin metodos)

    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    //* 3. Respuesta
    res.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    //* 1. Validar el ID y datos de entrada
    const { id } = req.params; //* <-- obtiene el id de la url
    const validatedData = UpdateProductSchema.parse(req.body); //* <-- Lanza un error si no es valido

    //*2 Actualizar (solo cambios enviados)
    const updateProduct = await Product.findByIdAndUpdate(
      id,
      { $set: validatedData },
      { new: true }
    ).populate("artisan", "name");

    if (!updateProduct) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    //* 3. Respuesta
    res.json(updateProduct);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Error en los parámetros de búsqueda",
        details: error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
