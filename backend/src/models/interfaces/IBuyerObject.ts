
import { Schema } from "mongoose";

export interface IBuyerObject {
    _id: Schema.Types.ObjectId;
    name: string;
    email: string;
    
}