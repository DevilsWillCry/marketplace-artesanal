import { Schema, model, Document } from "mongoose";

export interface IProduct extends Document {
    name: string;
    description : string;
    price: number; 
    images?: string[];
    category: string;
    artisan: Schema.Types.ObjectId | string;
    stock: number;
    isActive?: boolean;
}

const productSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });


// Indice compuesto para evitar duplicados
productSchema.index({ name: 1, artisan: 1 }, { unique: true });

export const Product = model<IProduct>('Product', productSchema);