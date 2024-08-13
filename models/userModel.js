const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const generateRandomId = () => {
  return Math.floor(10000000 + Math.random() * 900000); 
};

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
    parentPhone: {
      type: String,
      required: [true, `Parent Phone number is required`],
    },
    governorate: {
      type: String,
      required: [true, `Governorate is required`],
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
    loginAttempts: {
      type: Number,
      default: 0,
    },
    logoutAttempts: {
      type: Number,
      default: 0,
    },
    loginHistory: [
      {
        ip: String,
        country: String,
        device: String,
        timestamp: Date,
      },
    ],
    logoutHistory: [
      {
        ip: String,
        country: String,
        device: String,
        timestamp: Date,
      },
    ],
    initialLoginIp: String,
    randomId: {
      type: Number,
      unique: true,
      default: generateRandomId,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // If the randomId is not already set, generate a new one
  if (!this.randomId) {
    this.randomId = generateRandomId();
  }

  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
