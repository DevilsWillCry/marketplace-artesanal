import Stripe from "stripe";
import { config } from "dotenv";

// Cargar variables de entorno de .env
config();

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as string, {
    apiVersion: "2025-05-28.basil",
});