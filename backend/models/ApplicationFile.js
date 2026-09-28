const mongoose = require("mongoose");

const applicationFileSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },

    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequirement",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    filePath: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

const ApplicationFile = mongoose.model(
  "ApplicationFile",
  applicationFileSchema,
);

module.exports = ApplicationFile;
