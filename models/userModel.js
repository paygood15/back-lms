const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, `Name is required`],
    },
    email: {
      type: String,
      required: [true, `Email is required`],
      unique: true,
    },
    phone: {
      type: String,
      required: [true, `Phone number is required`],
    },
    password: {
      type: String,
      required: [true, `Password is required`],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, `Category is required`],
    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    resetCodeVerified: Boolean,
    myCourses: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "StudentCourse",
      },
    ],
    isDisabled: {
      type: Boolean,
      default: false,
    },
    disabledAt: Date,
    usedCoupons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
    ],
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});



const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
