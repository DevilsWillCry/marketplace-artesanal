import jwt from "jsonwebtoken";
import { config } from "dotenv";

// Cargar variables de entorno de .env
config();

// Clave secreta para firmar el token
const JWT_SECRET_KEY = process.env.JWT_SECRTE_KEY as string;

export const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, JWT_SECRET_KEY, { expiresIn: "1d" });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET_KEY);
};

