const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Coupon name is required"],
      unique: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Coupon price is required"],
    },
    discount: {
      type: Number,
      required: [true, "Discount value is required"],
    },
    commission: {
      type: Number,
      required: [true, "Commission per use is required"],
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: "subCategory",
      default: null,
    },
  },
  { timestamps: true }
);

const CouponModel = mongoose.model("Coupon", couponSchema);
module.exports = CouponModel;
