import { Schema, model, Document } from "mongoose";

//* Interfaz para los items de pedido
interface IOrderItem {
  product: Schema.Types.ObjectId;
  quantity: number;
  priceAtPurchase: number; //* Precio al momento de la compra
  artisan: Schema.Types.ObjectId; //* Usuario que vende el producto
}

//* interface para la direccion de envio
interface IShippingAddress {
  street: string;
  city: string;
  country: string;
  postalCode?: string;
}

//* Interfaz para el historial
interface IHistory {
  status: String;
  changedBy: { type: Schema.Types.ObjectId; ref: "User" };
  date: Date;
  metadata: {
    cancellationReason: String;
  };
}

//* Interfaz para la solicitud de devolucion
interface IRequestReturn {
  requestedBy: { type: Schema.Types.ObjectId; ref: "User" };
  requestedAt: Date;
  status: String;
  metadata: Record<string, any>
}

//* Interfaz principal del pedido.
interface IOrder extends Document {
  buyer: Schema.Types.ObjectId; //* Usuario que realiza el pedido
  items: IOrderItem[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress: IShippingAddress;
  paymentMethod: "credit_card" | "paypal" | "cash_on_delivery";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  trackingNumber?: string;
  history?: IHistory[];
  returnRequest?: IRequestReturn;
  createdAt: Date;
  updatedAt: Date;
}

const requestReturnSchema = new Schema<IRequestReturn>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false } // evita crear un _id por cada subdocumento si no lo necesitas
);

const historySchema = new Schema<IHistory>(
  {
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { _id: false } // evita crear un _id por cada subdocumento si no lo necesitas
);

// Esquema de Mongoose
const orderSchema = new Schema<IOrder>(
  {
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        priceAtPurchase: { type: Number, required: true },
        artisan: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "paypal", "cash_on_delivery"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    history: [historySchema],
    returnRequest: [requestReturnSchema],
    trackingNumber: { type: String },
  },
  { timestamps: true } // Agrega createdAt y updatedAt automáticamente
);

// Índices para optimizar consultas
orderSchema.index({ buyer: 1 });
orderSchema.index({ "items.artisan": 1 });
orderSchema.index({ status: 1 });

export const Order = model<IOrder>("Order", orderSchema);
