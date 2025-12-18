import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatarColor: {
      type: String,
      default: "#3b82f6",
    },
    resetOTP: {
      type: String,
      default: null,
    },
    resetOTPExpiry: {
      type: Date,
      default: null,
    },
    resetEmail: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Account = mongoose.model("Account", AccountSchema);
