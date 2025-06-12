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

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // 1. Verificar si el refreshToken existe en la base de datos
    const user = await User.findOne({ refreshTokens: refreshToken });
    if(!user){
      res.status(401).json({ message: 'Token de refresco invalido.' })
      return; 
    };

    // 2. Verificar el token JWT.
    const decoded = verifyToken(refreshToken) as { id: string };

    // 3. Generar nuevos tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, user.role);

    // 4. Actualizar en la DB (reemplazar el viejo token por el nuevo).
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: refreshToken },
      $push: { refreshTokens: newRefreshToken },
    });

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error("Error en refreshToken", error);
    res.status(401).json({ message: "Token de refeesco invalido." });
  }
};


// Controlador de registro de usuario
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Error de validación",
        details: validationResult.error.errors,
      });
      return;
    }

    const { name, email, password } = validationResult.data;

    // Verificar email existente
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "El correo ya está registrado" });
      return;
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      status: "active", // Valor por defecto
      role: "user", // Valor por defecto
    });

    // Generar tokens JWT
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);


    // Guardar refreshToken en la base de datos
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken }, // Agregar el refreshToken al array
    });

    // Excluir password y enviar respuesta
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(201).json({
      message: "Usuario creado con éxito",
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// Controlador de inicio de sesión
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: "Error de validación",
        details: validationResult.error.errors,
      });
      return;
    }

    const { email, password } = validationResult.data;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Credenciales incorrectas" });
      return;
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Credenciales incorrectas" });
      return;
    }

    // Generar tokens JWT
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);

    // Actualizar refreshToken en la base de datos
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken }
    });

    // Excluir password y enviar respuesta
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      data: {
        user: userWithoutPassword,
        tokens: { accessToken, refreshToken }
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


export const logout = async(req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
  } catch (error) {
    
  }
}