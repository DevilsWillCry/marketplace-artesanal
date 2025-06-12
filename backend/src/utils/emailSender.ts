import nodemailer from "nodemailer";
import { config } from "dotenv";

// Cargar variables de entorno de .env
config();

// Configuración de Nodemailer para enviar emails de verificación
/*
 * Crea un objeto de transporte de Nodemailer utilizando la configuración SMTP definida en las variables de entorno.
 *
 * El transporte se configura con el servicio, puerto y credenciales de autenticación para el envío de correos electrónicos.
*/
const transport = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  port: parseInt(process.env.SMTP_PORT as string),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Función para enviar el correo de verificación
/**
 * Envía un correo electrónico de verificación a la dirección especificada con un token único.
 *
 * @param email - Dirección de correo electrónico del destinatario.
 * @param token - Token de verificación que se incluirá en el correo.
 * @returns Una promesa que se resuelve cuando el correo ha sido enviado.
 */
export const sendVerificationEmail = async (email: string, token: string) => {
  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "Verifica tu cuenta",
    text: `Verifique su cuenta en la siguiente URL: http://localhost:3000/api/auth/verify/${token}`,
  });
};
