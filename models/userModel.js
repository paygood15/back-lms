const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dbConnection = require("../config/database");

const generateRandomId = async (governorate) => {
  if (!governorate) {
    throw new Error("Governorate is not defined");
  }

  const governorateInitials = governorate.slice(0, 3).toUpperCase();
  let digits = 3;
  let randomId;

  while (true) {
    // توليد randomId باستخدام عدد الأرقام الحالي
    randomId =
      governorateInitials +
      Math.floor(
        Math.pow(10, digits - 1) + Math.random() * 9 * Math.pow(10, digits - 1)
      );

    // تحقق إذا كان randomId موجود بالفعل
    const existingUser = await UserModel.findOne({ randomId });
    if (!existingUser) {
      // إذا لم يكن موجودًا، ارجعه
      return randomId;
    }

    // زيادة عدد الأرقام إذا كان randomId موجود بالفعل
    digits++;
  }
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
      type: String,
      unique: true,
      default: null,
    },
    deviceFingerprint: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  // If the randomId is not already set, generate a new one based on governorate
  if (!this.randomId) {
    this.randomId = await generateRandomId(this.governorate);
  }

  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;

