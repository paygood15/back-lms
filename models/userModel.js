const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// نموذج لتتبع التسلسل بناءً على المحافظة
const sequenceSchema = new mongoose.Schema({
  governorate: {
    type: String,
    required: true,
    unique: true,
  },
  currentNumber: {
    type: Number,
    default: 0,
  },
});

const SequenceModel = mongoose.model("Sequence", sequenceSchema);

// دالة لتوليد randomId بناءً على التسلسل في المحافظة
const generateRandomId = async (governorate) => {
  if (!governorate) {
    throw new Error("Governorate is not defined");
  }

  const governorateInitials = governorate.slice(0, 3).toUpperCase();

  // ابحث عن الرقم التسلسلي الحالي أو قم بإنشائه إذا لم يكن موجودًا
  let sequence = await SequenceModel.findOne({ governorate });

  if (!sequence) {
    sequence = await SequenceModel.create({ governorate });
  }

  // زيادة الرقم التسلسلي
  sequence.currentNumber += 1;
  await sequence.save();

  // توليد randomId باستخدام الرقم التسلسلي الحالي
  const digits = 2; // عدد الأرقام التسلسلية
  const randomId =
    governorateInitials +
    sequence.currentNumber.toString().padStart(digits, "0");

  return randomId;
};

// نموذج المستخدم
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

// Middleware لتوليد randomId قبل حفظ المستخدم
userSchema.pre("save", async function (next) {
  // إذا لم يكن randomId موجودًا، قم بإنشائه استنادًا إلى المحافظة
  if (!this.randomId) {
    this.randomId = await generateRandomId(this.governorate);
  }

  // إذا لم يتم تعديل كلمة المرور، تخطى عملية التشفير
  if (!this.isModified("password")) return next();

  // تشفير كلمة المرور
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;
