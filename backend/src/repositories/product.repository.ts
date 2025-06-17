// product.repository.ts
import { Product, IProduct } from "../models/product.model";
import { UpdateQuery } from "mongoose";
import { CreateProductInput } from "../validators/product.validator";

//* Clase de repositorio de productos
export class ProductRepository {
  //* Función de creación de productos
  async create(productData: CreateProductInput): Promise<IProduct> {
    return Product.create(productData);
  }

  //* Función para actualizar un producto
  async update(
    id: string,
    updateData: UpdateQuery<IProduct>
  ): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(id, updateData, { new: true });
  }

  //* Función de busqueda de productos por artista
  async findByArtisan({
    artisanId,
  }: {
    artisanId: string;
  }): Promise<IProduct[]> {
    return Product.find({ artisan: artisanId }).populate(
      "artisan",
      "name email"
    );
  }

  //* Función de busqueda de productos
  async searchProduct(query: string): Promise<IProduct[]> {
    return Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } }, // 'i' para case-insensitive
        { description: { $regex: query, $options: "i" } },
      ],
      isActive: true, // Solo productos activos
    });
  }

  //* Función de eliminación de productos
  async delete(id: string): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(
      id,
      { isActive: false }, // Soft delete
      { new: true }
    );
  }
}
