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
      required: true
    },
    Email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true,
      //minlength: 6
    },
    token: {
      type: String,
      default: null
    },
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("users", userSchema);

export default User;
