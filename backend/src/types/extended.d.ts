import 'express';
import { User } from '../models/user.model';

//* Agrega la propiedad userId a la interfaz Request de express// types/extended.d.ts o src/types/extended.d.ts

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string,
    user?: User
  }
}
