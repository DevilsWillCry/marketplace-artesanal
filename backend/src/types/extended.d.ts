import {  Request } from 'express';
import { User } from '../models/user.model';
import { Document } from 'mongoose'; 

//* Agrega la propiedad userId a la interfaz Request de express
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
    }
  }
};
