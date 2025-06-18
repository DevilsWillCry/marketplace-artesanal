//* src/utils/auth.ts
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import TokenPayload from "../models/interfaces/TokenPayload";

//* Cargar variables de entorno de .env
config();

const JWT_SECRET = process.env.JWT_SECRET_KEY as string; //* Clave secreta para firmar el token
const ACCESS_TOKEN_EXPIRY = "15m";                       //* 15 minutos por defecto para el token de acceso
const REFRESH_TOKEN_EXPIRY = "7d";                       //* 7 dias por defecto para el token de actualización



//! ---------------------------------------------------------------------------------------- !//
//* Función para generar un token de acceso
/**
 * *Genera y firma un token de acceso y un token de actualización para un usuario dado.
 *
 * @param userId - El identificador único del usuario.
 * @param role - El rol asignado al usuario.
 * @returns Un objeto con el token de acceso y el token de actualización.
 */
export const generateTokens = (userId: string, role: string) => {

  //* Generar el token de acceso
  const accessToken = jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
 
  //* Generar el token de actualización 
  const refreshToken = jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
};
//! ---------------------------------------------------------------------------------------- !//


//! ---------------------------------------------------------------------------------------- !//
//* Función para verificar un token JWT
/**
 * *Verifica un token JWT y devuelve la carga útil decodificada que contiene el id de usuario y el rol opcional.
 *
 * @param token - El token JWT a verificar.
 * @returns La carga útil decodificada del token con id y rol opcional.

 */
export const verifyToken = (token:string) => {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
//! ---------------------------------------------------------------------------------------- !//
