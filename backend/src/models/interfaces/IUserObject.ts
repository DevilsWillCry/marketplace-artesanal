import { Types } from "mongoose";

export interface IUserObject {
  _id: Types.ObjectId;
  name: string;
}
