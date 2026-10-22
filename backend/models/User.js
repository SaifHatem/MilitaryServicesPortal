const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    nationalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    // Hash العبارة السرية لاستعادة الحساب.
    recoveryPhraseHash: {
      type: String,
      select: false,
    },

    // Hash رمز إعادة تعيين كلمة المرور.
    passwordResetTokenHash: {
      type: String,
      select: false,
    },

    // موعد انتهاء صلاحية رمز الاستعادة.
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "reviewer", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
