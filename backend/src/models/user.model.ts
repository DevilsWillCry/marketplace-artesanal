import { Schema, model,  } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  refreshTokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true }
  }], // Array de tokens de refresco
}, { timestamps: true });

export const User = model('User', userSchema);
