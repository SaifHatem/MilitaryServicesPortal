const mongoose = require("mongoose");

const serviceRequirementSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["image", "document", "form", "info", "text"],
      default: "image",
    },

    required: {
      type: Boolean,
      default: true,
    },

    minFiles: {
      type: Number,
      default: 1,
    },

    maxFiles: {
      type: Number,
      default: 1,
    },

    allowMultiple: {
      type: Boolean,
      default: false,
    },

    downloadableTemplate: {
      type: Boolean,
      default: false,
    },

    requiresReupload: {
      type: Boolean,
      default: false,
    },

    requiresUpload: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const ServiceRequirement = mongoose.model(
  "ServiceRequirement",
  serviceRequirementSchema,
);

module.exports = ServiceRequirement;
