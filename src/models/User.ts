import mongoose, { Schema, model, models, type Document } from 'mongoose';
import type { UserType, LearningProfile } from '@/types';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  image?: string;
  userType: UserType;           // élève (RAG curriculum) ou étudiant (open bar)
  learningProfile: LearningProfile;
  createdAt: Date;
  updatedAt: Date;
}

const LearningProfileSchema = new Schema<LearningProfile>(
  {
    weakSubjects:  { type: [String], default: [] },
    studiedTopics: { type: [String], default: [] },
    totalSessions: { type: Number, default: 0 },
    lastActiveAt:  { type: Date },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name:            { type: String, required: true, trim: true, maxlength: 80 },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:    { type: String, required: true },
    image:           { type: String },
    userType:        { type: String, enum: ['eleve', 'etudiant'], default: 'eleve' },
    learningProfile: { type: LearningProfileSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Prevent model re-compilation in Next.js hot reload
export const User = models.User ?? model<IUser>('User', UserSchema);
