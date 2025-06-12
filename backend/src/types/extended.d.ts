import {  Request } from 'express';
import { User } from '../models/user.model';

// Agrega la propiedad userId a la interfaz Request de express
declare module 'express' {
  interface Request {
    user?: User;
    userId?: string;
  }
}