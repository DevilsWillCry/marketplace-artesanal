import { Request, Response } from "express";
import { User } from "../models/user.model";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateTokens, verifyToken } from "../utils/auth"; // Asegúrate de crear este archivo

// Validación de registro
const registerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("El correo no es válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Validación de inicio de sesión
const loginSchema = z.object({
  email: z.string().email("El correo no es válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

//! ---------------------------------------------------------------------------------------- !//
//* Controlador de refresco de token
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    //* 1. Verificar si el refreshToken existe en la base de datos
    const user = await User.findOne({ refreshTokens: refreshToken });
    if (!user) {
      res.status(401).json({ message: "Token de refresco invalido." });
      return;
    }

    //* 2. Verificar el token JWT.
    const decoded = verifyToken(refreshToken) as { id: string };

    //* 3. Generar nuevos tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(decoded.id, user.role);

    //* 4. Actualizar en la DB (reemplazar el viejo token por el nuevo).
    // Primero elimina el token viejo
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: refreshToken },
    });

    // Luego añade el nuevo
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: newRefreshToken },
    });

    //* 5. Enviar los nuevos tokens
    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Error en refreshToken", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
//! ---------------------------------------------------------------------------------------- !//

//! ---------------------------------------------------------------------------------------- !//
//* Controlador de registro de usuario
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    //* 1. Validación con Zod
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Error de validación",
        details: validationResult.error.errors,
      });
      return;
    }

    const { name, email, password } = validationResult.data;

    //* 2. Verificar email existente
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "El correo ya está registrado" });
      return;
    }

    //* 3. Hashear contraseña
    const salt = await bcrypt.genSalt(10); // Generar salt que es un número aleatorio para aumentar la seguridad de la contraseña
    const hashedPassword = await bcrypt.hash(password, salt); // Hashear la contraseña con el salt generado

    //* 4. Crear usuario
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      status: "active", // Valor por defecto
      role: "user", // Valor por defecto
    });

    //* 5. Generar tokens JWT
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role
    );

    //* 6. Guardar refreshToken en la base de datos
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken }, // Agregar el refreshToken al array
    });

    //* 7. Excluir password de la respuesta y enviar el resto.
    const { password: _, ...userWithoutPassword } = user.toObject();

    //* 8. Enviar respuesta
    res.status(201).json({
      message: "Usuario creado con éxito",
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
//! ---------------------------------------------------------------------------------------- !//

//! ---------------------------------------------------------------------------------------- !//
//*  Controlador de inicio de sesión
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    //* 1. Validación con Zod
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Error de validación",
        details: validationResult.error.errors,
      });
      return;
    }

    const { email, password } = validationResult.data;

    //* 2. Buscar usuario por correo
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Credenciales incorrectas" });
      return;
    }

    //* 3. Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Credenciales incorrectas" });
      return;
    }

    //* 4. Generar tokens JWT
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.role
    );

    //* 5. Actualizar refreshToken en la base de datos
    //? push -> Agregar un elemento al final del array
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
    });

    //* 6. Excluir password y enviar respuesta
    const { password: _, ...userWithoutPassword } = user.toObject();

    //* 7. Enviar respuesta
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
//! ---------------------------------------------------------------------------------------- !//

//! ---------------------------------------------------------------------------------------- !//

//* Controlador de cierre de sesión

export const logout = async(req: Request, res: Response): Promise<void> => {
  try {

    const userId = req.user?._id;         //* Obtiene el id del authMiddleware
    const { refreshToken } = req.body;    //* Obtiene el refreshToken desde el cuerpo de la solicitud

    if (!userId) {
      res.status(401).json({ message: "Acceso no autorizado" });
      return;
    }

    //* 1. Elimina el refreshToken específico del usuario
    //? pull -> eliminar un elemento del array
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: refreshToken } 
    });

    res.status(200).json({ message: "Sesión cerrada exitosamente" });

  } catch (error) {
    
  }
}
//! ---------------------------------------------------------------------------------------- !//

//! ---------------------------------------------------------------------------------------- !//
//? Opcional: logout de todos los dispositivos
export const logoutAll = async(req: Request, res: Response): Promise<void> => {

  //* 1. Elimina todos los refreshTokens del usuario
  //? set -> reemplaza el array completo con un nuevo array vacio
  try {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: { refreshTokens: [] }
    });

    res.status(200).json({ message: "Sesiones cerrada en todos los dispositivos" });
  } catch (error) {
    res.status(500).json({ error: "Error al cerrar las sesiones" });
  }
}
//! ---------------------------------------------------------------------------------------- !//

