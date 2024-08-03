const AsyncHandler = require("express-async-handler");
const userModel = require("../models/userModel");
const slugify = require("slugify");
const CategoryModel = require("../models/categoryModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.addUser = AsyncHandler(async (req, res) => {
  const categoryFind = await CategoryModel.findById(req.body.category);
  if (!categoryFind) {
    return res.status(400).json({
      success: false,
      error: "Invalid Category",
    });
  }

  const user = await userModel.create(req.body);
  res.status(201).json({
    success: true,
    data: user,
  });
});

exports.getAllUsers = AsyncHandler(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 5;
  const skip = (page - 1) * limit;

  const users = await userModel
    .find()
    .skip(skip)
    .limit(limit)
    .populate(`category`, `name`);
  res.status(200).json({
    results: users.length,
    page,
    limit,
    pagesCount: Math.ceil(users.length / limit),
    data: users,
  });
});
exports.getSpecificUser = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel
    .findById(id)
    .populate(`category`, `name`)
    .populate("myCourses", "courses");
  if (!user) {
    return next(new ApiError(`No user has id : ${id}`, 400));
  }
  res.status(200).json({
    success: true,
    data: user,
  });
});
exports.updateUser = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      category: req.body.category,
      parentPhone: req.body.parentPhone,
      governorate: req.body.governorate,
    },
    { new: true }
  );
  if (!user) {
    return next(new ApiError(`No user has id : ${id}`, 400));
  }
  res.status(201).json({
    success: true,
    data: user,
  });
});
exports.changePassword = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndUpdate(
    id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    { new: true }
  );
  if (!user) {
    return next(new ApiError(`No user has id : ${id}`, 400));
  }
  res.status(201).json({
    success: true,
    data: user,
  });
});

exports.deleteUser = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findByIdAndDelete(id);
  if (!user) {
    return next(new ApiError(`No User has id : ${id}`, 400));
  }
  res.status(200).json({
    msg: `User Is Deleted Successfully`,
  });
});
const filterObject = (obj, ...allowedFields) => {
  const newBodyObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) newBodyObj[key] = obj[key];
  });
  return newBodyObj;
};
exports.updateLoggedUserPassword = AsyncHandler(async (req, res, next) => {
  // 1) Update user by token payload (user._id)
  const user = await userModel.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  // 2) Generate token
  // logged in again after updating password and send jwt (i will make it optional)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  res.status(200).json({ data: user, token });
  next();
});

exports.updateLoggedUserData = AsyncHandler(async (req, res, next) => {
  // 1) Select fields that allowed to update
  const allowedBodyFields = filterObject(req.body, "name", "email", "phone");
  // console.log(req.body);
  // console.log(allowedBodyFields);
  // 2) Update user document
  const updatedUser = await userModel.findByIdAndUpdate(
    req.user.id,
    allowedBodyFields,
    {
      new: true,
    }
  );

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});
exports.getLoggedUserData = AsyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});
exports.toggleUserStatus = AsyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await userModel.findById(id);

  if (!user) {
    return next(new ApiError(`No user found with id: ${id}`, 404));
  }

  user.isDisabled = !user.isDisabled;
  user.disabledAt = user.isDisabled ? Date.now() : null;

  await user.save();

  res.status(200).json({
    success: true,
    data: user,
  });
});
