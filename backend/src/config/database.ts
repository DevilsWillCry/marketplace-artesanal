import mongoose from 'mongoose';
import { config } from 'dotenv';

config(); // Carga variables de .env

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI as string);
    console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error);
    process.exit(1);
  }
};

export const dbStatus = () =>  mongoose.connection.readyState;
