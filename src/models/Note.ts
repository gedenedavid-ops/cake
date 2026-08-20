import mongoose, { Schema, model, models, type Document } from 'mongoose';

const TagSchema = new Schema(
  {
    id:    { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: '#F5F3EF' },
  },
  { _id: false }
);

const AttachmentSchema = new Schema(
  {
    id:   { type: String, required: true },
    type: { type: String, enum: ['image', 'pdf', 'link'], required: true },
    url:  { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number },
  },
  { _id: false }
);

export interface INote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  subject: string;
  tags: { id: string; label: string; color: string }[];
  mood?: string;
  attachments: { id: string; type: string; url: string; name: string; size?: number }[];
  isLocked: boolean;
  isPinned: boolean;
  isFavorite: boolean;
  color?: string;
  wordCount: number;
  readTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:       { type: String, required: true, maxlength: 300 },
    content:     { type: String, default: '' },
    subject:     { type: String, required: true },
    tags:        { type: [TagSchema], default: [] },
    mood:        { type: String },
    attachments: { type: [AttachmentSchema], default: [] },
    isLocked:    { type: Boolean, default: false },
    isPinned:    { type: Boolean, default: false },
    isFavorite:  { type: Boolean, default: false },
    color:       { type: String, enum: ['default', 'ochre', 'dark'], default: 'default' },
    wordCount:   { type: Number, default: 0 },
    readTime:    { type: Number, default: 1 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: all notes for a user sorted by updatedAt
NoteSchema.index({ userId: 1, updatedAt: -1 });

export const Note = models.Note ?? model<INote>('Note', NoteSchema);
