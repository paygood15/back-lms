const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    door: {
      type: mongoose.Schema.ObjectId,
      ref: "Door",
      default: null,
    },
    subCategory: {
      type: mongoose.Schema.ObjectId,
      ref: "subCategory",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    couponCode: {
      type: String,
      default: null,
    },
    accessCode: {
      type: String,
      default: null,
    },
    finalPrice: {
      type: Number,
      required: [true, "Final price is required"],
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("Order", orderSchema);
module.exports = OrderModel;
