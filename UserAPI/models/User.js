import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // id: {
    //   type: Number,
    //   required: true,
    //   unique: true
    // },
    Username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    Email: {
      type: String,
      required: true
      //unique: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    token: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    permissions: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for populating user's tasks (Method 1: Virtual Population)
userSchema.virtual('tasks', {
  ref: 'tasks',
  localField: '_id',
  foreignField: 'userId',
  justOne: false
});

// Virtual for task count
userSchema.virtual('taskCount', {
  ref: 'tasks',
  localField: '_id',
  foreignField: 'userId',
  count: true
});

// Index for virtual population performance
userSchema.index({ createdAt: -1 });

const User = mongoose.model("users", userSchema);

export default User;
