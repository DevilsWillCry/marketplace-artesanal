// services/product.service.ts
import { ProductRepository } from "../repositories/product.repository";
import {
  CreateProductInput,
  UpdateProductInput,
} from "../validators/product.validator";
import { IProduct } from "../models/product.model";
import { Product } from "../models/product.model";

export class ProductService {
  constructor(private repository: ProductRepository) {}

  async createProduct(input: CreateProductInput): Promise<IProduct> {
    const existingProduct = await Product.findOne({
      name: input.name,
      artisan: input.artisan,
    });
    if (existingProduct) {
      throw new Error("Ya existe un producto con el mismo nombre y artista.");
    }
    return this.repository.create(input);
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput
  ): Promise<IProduct | null> {
    return this.repository.update(id, input);
  }
}
