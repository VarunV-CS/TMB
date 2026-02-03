import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for populated user information (Method 1: Virtual Population)
taskSchema.virtual('createdBy', {
  ref: 'users',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for formatted status
taskSchema.virtual('statusFormatted').get(function() {
  return this.status.replace('_', ' ');
});

// Virtual for is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return new Date(this.dueDate) < new Date() && this.status !== 'completed';
});

// Compound index for efficient user-task queries
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });

// Compound unique index to prevent duplicate task names for the same user (case-insensitive)
taskSchema.index({ userId: 1, title: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const Task = mongoose.model("tasks", taskSchema);

export default Task;
