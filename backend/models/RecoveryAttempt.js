const mongoose = require("mongoose");

const recoveryAttemptSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },

    count: {
      type: Number,
      required: true,
      default: 0,
    },

    windowExpiresAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// حذف السجلات القديمة تلقائيًا من MongoDB.
recoveryAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RecoveryAttempt", recoveryAttemptSchema);
