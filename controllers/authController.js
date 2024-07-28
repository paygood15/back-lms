const asyncHandler = require("express-async-handler");
const crypto = require("crypto");

// const slugify = require("slugify");
const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError");
const CategoryModel = require("../models/categoryModel");
const sendEmail = require("../utils/sendEmail");

exports.signup = asyncHandler(async (req, res) => {
  const { name, phone, email, password, category } = req.body;

  // التحقق من وجود الفئة
  const categoryFind = await CategoryModel.findById(category);
  if (!categoryFind) {
    return res.status(400).json({
      success: false,
      error: "Invalid Category",
    });
  }

  // إنشاء المستخدم
  const user = await userModel.create({
    name,
    phone,
    email,
    password,
    category,
  });

  // إنشاء رمز التحقق (JWT)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(201).json({ data: user, token });
});
exports.login = asyncHandler(async (req, res, next) => {
  // 1. البحث عن المستخدم بناءً على البريد الإلكتروني
  const user = await userModel.findOne({ email: req.body.email });

  // 2. التحقق من وجود المستخدم وتطابق كلمة المرور
  let isCorrectPassword = false;
  if (user) {
    isCorrectPassword = await bcrypt.compare(req.body.password, user.password);
  }

  // 3. التحقق من صحة البريد الإلكتروني وكلمة المرور
  if (!user || !isCorrectPassword) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  // 4. التحقق من حالة الحساب (إذا كان موقوفًا)
  if (user.isDisabled) {
    return next(
      new ApiError(
        "Your account is disabled. Please contact admin for more information.",
        403
      )
    );
  }

  // 5. زيادة عدد محاولات تسجيل الدخول
  user.loginAttempts += 1;
  await user.save();

  // 6. إنشاء توكن JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // 7. حذف كلمة المرور من الكائن المستخدم قبل إرسال الاستجابة
  delete user._doc.password;

  // 8. إرسال الاستجابة
  res.status(200).json({ data: user, token });
});
exports.logout = asyncHandler(async (req, res, next) => {
  const user = await userModel.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Update logout attempts
  user.logoutAttempts += 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc     Make sure that user is logged in
exports.auth = asyncHandler(async (req, res, next) => {
  // 1- Get the token and check if exists
  // console.log(req.headers);
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    // console.log(token);
  }
  if (!token) {
    return next(
      new ApiError("You are not logged in. Please login to get access", 401)
    );
  }
  // 2- Verify the token (check if the token changes the payload or the token is expired)
  // two errors maybe happens : 1- invalid token 2- expired token
  // convert a method that returns responses using a callback function to return a responses in a promise object
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // 3- Check the user exists
  const currentUser = await userModel.findById(decoded.id);
  if (!currentUser) {
    return next(
      new ApiError("The user that belong to this token does no longer exist")
    );
  }
  // 4- Check if user change his password after generating the token
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed password! Please login again..",
          401
        )
      );
    }
    // console.log(passChangedTimestamp, decoded.iat);
  }
  // Grant access to the protected routes
  req.user = currentUser;
  next();
});
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    // ["admin"] or ["admin", "editor"]
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to perform this action", 403)
      );
    }
    next();
  });
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user by email
  const { email } = req.body;
  const user = await userModel.findOne({ email });
  if (!user) {
    return next(
      new ApiError(`There is no user with this email address ${email}`, 404)
    );
  }
  // 2) Generate the random reset token or random 6 digits and save it in db (explain it on draw.io)
  // 2) Generate random reset code and save it in db
  // save the encrypted reset code into our db and send the un encrypted via email
  // https://nodejs.org/en/knowledge/cryptography/how-to-use-crypto-module/
  // generate 6 digit random number in javascript
  const resetCode = Math.floor(Math.random() * 1000000 + 1).toString();
  // encrypt the reset code before saving it in db (Security)
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  // console.log(resetCode);
  // console.log(hashedResetCode);

  // Save password reset code into database
  user.passwordResetCode = hashedResetCode;
  // Add expiration time for password reset code (10 min for example)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // because user maybe send new code after verify one
  user.resetCodeVerified = false;
  user.save();

  // 3)  Send password reset code via email
  // We use try and catch because i want to implement logic if error happens
  const message = `Forgot your password? Submit this reset password code : ${resetCode}\n If you didn't forgot your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your Password Reset Code (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "Success",
      message: "Reset code sent to your email",
      // userId: user.id,
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    console.log(err);
    return next(
      new ApiError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});
exports.verifyPasswordResetCode = asyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code ! because we have not user id
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  // 2) Check if reset code is valid or expired
  const user = await userModel.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }
  // 4) If reset code has not expired, and there is user send res with userId
  user.resetCodeVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // 1) Get user based on email
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new ApiError(
        `There is no user with this email address ${req.body.email}`,
        404
      )
    );
  }
  // Check if user verify the reset code
  if (!user.resetCodeVerified) {
    return next(new ApiError("reset code not verified", 400));
  }
  // 2) Update user password & Hide passwordResetCode & passwordResetExpires from the result
  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.resetCodeVerified = undefined;

  await user.save();

  // 3) If everything ok, send token to client
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(200).json({ token });
});
