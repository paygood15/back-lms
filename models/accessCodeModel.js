const mongoose = require("mongoose");

const accessCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Access code is required"],
      unique: true,
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: "subCategory",
      required: [true, "Course is required"],
    },
    discount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
    },
    validTo: {
      type: Date,
      required: [true, "Valid to date is required"],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const AccessCodeModel = mongoose.model("AccessCode", accessCodeSchema);
module.exports = AccessCodeModel;
