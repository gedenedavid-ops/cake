import mongoose, { Schema, model, models, type Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true, maxlength: 80 },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    image:        { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent model re-compilation in Next.js hot reload
export const User = models.User ?? model<IUser>('User', UserSchema);
