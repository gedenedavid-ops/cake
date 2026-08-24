import mongoose, { Schema, model, models, type Document } from 'mongoose';

// ─── Sous-schémas ─────────────────────────────────────────────────────────────

const NoteSourceSchema = new Schema(
  {
    noteId:  { type: String, required: true },
    title:   { type: String, required: true },
    excerpt: { type: String, default: '' },
    score:   { type: Number, default: 0 },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema(
  {
    id:        { type: String, required: true },
    role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    sources:   { type: [NoteSourceSchema], default: [] },
    // résumé généré par l'IA à la fin d'une session longue
    sessionSummary: { type: String },
  },
  { _id: false }
);

// ─── Interface TypeScript ─────────────────────────────────────────────────────

export interface IChatSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    sources?: { noteId: string; title: string; excerpt: string; score: number }[];
    sessionSummary?: string;
  }[];
  summary?: string;   // résumé consolidé de la session (généré après N messages)
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schéma Mongoose ──────────────────────────────────────────────────────────

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:    { type: String, default: 'Nouvelle conversation', maxlength: 120 },
    messages: { type: [ChatMessageSchema], default: [] },
    summary:  { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index : toutes les sessions d'un utilisateur triées par date
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

export const ChatSessionModel =
  models.ChatSession ?? model<IChatSession>('ChatSession', ChatSessionSchema);
