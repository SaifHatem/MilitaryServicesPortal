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
      trim: true,
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
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "minFiles يجب أن يكون رقمًا صحيحًا",
      },
    },

    maxFiles: {
      type: Number,
      default: 1,
      min: 0,
      validate: {
        validator: function (value) {
          return Number.isInteger(value) && value >= this.minFiles;
        },
        message: "maxFiles يجب أن يكون رقمًا صحيحًا وأكبر من أو يساوي minFiles",
      },
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
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "order يجب أن يكون رقمًا صحيحًا",
      },
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
