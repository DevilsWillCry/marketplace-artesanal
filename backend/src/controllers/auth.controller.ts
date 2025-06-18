import { Request, Response } from "express";
import { User } from "../models/user.model";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateTokens, verifyToken } from "../utils/auth"; // Asegúrate de crear este archivo
import TokenPayload from "../models/interfaces/TokenPayload";

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
    //* Obtener ip y userAgent
    const ip = req.ip || req.headers["x-forwarded-for"] || "Desconocido";
    const userAgent = req.get("User-Agent") || "Navegador desconocido";

    //* Obtener el token de refresco de la cookie
    const refreshToken = req.cookies.refreshToken;

    //* 1. Verificar si el objeto de token de refresco es valido en la DB
    const user = await User.findOne({
      "refreshTokens.token": refreshToken.token,
    });
    if (!user) {
      res.status(401).json({ message: "Token de refresco invalido." });
      return;
    }

    //* 2. Verificar el token JWT.
    const decoded = verifyToken(refreshToken.token) as TokenPayload;

    //* 3. Generar nuevos tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(decoded.id, user.role);

    //* 4. Generar un nuevo objeto de token de refresco
    const newRefreshTokenEntry = {
      token: newRefreshToken,
      createdAt: new Date((decoded.iat ?? 0) * 1000) || new Date(),
      expiresAt: new Date((decoded.exp ?? 0) * 1000) || 7 * 24 * 60 * 60 * 1000,
      ip,
      userAgent,
    };

    //* 5. Actualizar en la DB (reemplazar el viejo token por el nuevo).
    //? Primero elimina el token viejo
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token: refreshToken.token } },
    });

    //? Luego añade el nuevo
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: newRefreshTokenEntry },
    });

    //* 6. Enviar los nuevos tokens
    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenEntry,
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
    //* Obtener ip y userAgent
    const ip = req.ip || req.headers["x-forwarded-for"] || "Desconocido";
    const userAgent = req.get("User-Agent") || "Navegador desconocido";

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

    const newRefreshTokenEntry = {
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      ip,
      userAgent,
    };

    //* 6. Guardar refreshToken en la base de datos
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: newRefreshTokenEntry }, // Agregar el refreshToken al array
      $slice: -5, // Limitar el array a 5 elementos
    });

    //* 7. Guardar refreshToken en la cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, //* ✅ true en producción (HTTPS), false en desarrollo
      sameSite: "lax", //* También puedes usar "Strict" o "None" dependiendo tu frontend
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
    });

    //* 8. Excluir password de la respuesta y enviar el resto.
    const { password: _, ...userWithoutPassword } = user.toObject();

    //* 9. Enviar respuesta
    res.status(201).json({
      message: "Usuario creado con éxito",
      data: {
        user: userWithoutPassword,
        tokens: accessToken,
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

    //* Obtener ip y userAgent
    const ip = req.ip || req.headers["x-forwarded-for"] || "Desconocido";
    const userAgent = req.get("User-Agent") || "Navegador desconocido";

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

    //* 5. Generar un nuevo objeto de token de refresco
    const newRefreshTokenEntry = {
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      ip,
      userAgent,
    };

    //* 6. Actualizar refreshToken en la base de datos
    //? push -> Agregar un elemento al final del array
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: newRefreshTokenEntry },
    });

    //* 7. Guardar refreshToken en la cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, //* ✅ true en producción (HTTPS), false en desarrollo
      sameSite: "lax", //* Tambien puedes usar "Strict" o "None" dependiendo tu frontend
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias en ms
    });

    //* 6. Excluir password y enviar respuesta
    const { password: _, ...userWithoutPassword } = user.toObject();

    //* 7. Enviar respuesta
    res.status(200).json({
      message: "Inicio de sesión exitoso",
      data: {
        user: userWithoutPassword,
        tokens: accessToken,
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

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id; //* Obtiene el id del authMiddleware
    const refreshToken = req.cookies?.refreshToken; //* Obtiene el refreshToken de la cookie

    if (!userId) {
      res.status(401).json({ message: "Acceso no autorizado" });
      return;
    }

    //* 1. Elimina el refreshToken específico del usuario
    //? pull -> eliminar un elemento del array
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: refreshToken } },
    });

    //* 2. Elimina el refreshToken de la cookie
    res.clearCookie("refreshToken", {
      httpOnly: true, //* httponly -> solo se puede acceder a la cookie desde el servidor
      secure: false, //* Poner en true en produccion
      sameSite: "lax", //* lax permite el acceso a la cookie desde cualquier origen
    });

    res.status(200).json({ message: "Sesión cerrada exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al cerrar la sesión" });
  }
};
//! ---------------------------------------------------------------------------------------- !//

//! ---------------------------------------------------------------------------------------- !//
//? Opcional: logout de todos los dispositivos
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  //* 1. Elimina todos los refreshTokens del usuario
  //? set -> reemplaza el array completo con un nuevo array vacio
  try {
    await User.findByIdAndUpdate(req.user?._id, {
      $set: { refreshTokens: [] },
    });

    //* 2. Elimina el refreshToken de la cookie
    res.clearCookie("refreshToken", {
      httpOnly: true, //* httponly -> solo se puede acceder a la cookie desde el servidor
      secure: false, //* Poner en true en produccion
      sameSite: "lax", //* lax permite el acceso a la cookie desde cualquier origen
    });

    res
      .status(200)
      .json({ message: "Sesiones cerrada en todos los dispositivos" });
  } catch (error) {
    res.status(500).json({ error: "Error al cerrar las sesiones" });
  }
};
//! ---------------------------------------------------------------------------------------- !//
