import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  password: string;
  username: string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: true,
  },
});

export const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);
