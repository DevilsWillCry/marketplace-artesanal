import rateLimit from "express-rate-limit";

// Limite de solicitudes para la autenticación
export const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 50, // Limite de solicitudes por IP
    message: {
        message: 'Demasiadas solicitudes',
        details: 'Por favor intenta nuevamente despues de 15 minutos'
    },
    skipSuccessfulRequests: true 
})


// Limite de solicitudes para la API
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // Limite de solicitudes por IP
    message: {
        message: 'Demasiadas solicitudes',
        details: 'Por favor intenta nuevamente despues de 15 minutos'
    },
    skipSuccessfulRequests: false  // No ignorar solicitudes exitosas
})

export const refreshTokenLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 10, // Limite de solicitudes por IP
    message: {
        message: 'Demasiadas solicitudes',
        details: 'Por favor intenta nuevamente despues de 15 minutos'
    },
    skipSuccessfulRequests: true // Ignorar solicitudes exitosas, evita castigar a los usuarios legitimos
})

export const logoutAllLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 3, // Limite de solicitudes por IP
    message: {
        message: 'Demasiadas solicitudes',
        details: 'Por favor intenta nuevamente despues de 15 minutos'
    },
    skipSuccessfulRequests: false // Es mejor tomar en cuenta las solicitudes exitosas y no exitosas (>= 400)
});