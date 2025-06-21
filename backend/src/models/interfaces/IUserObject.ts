import { Schema } from "mongoose";

export interface IUserObject {
  _id: Schema.Types.ObjectId;
  name: string;
}