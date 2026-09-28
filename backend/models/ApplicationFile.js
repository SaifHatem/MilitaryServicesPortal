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
    },

    storedName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
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
