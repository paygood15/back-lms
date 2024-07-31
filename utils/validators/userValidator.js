const { check, body } = require("express-validator");
const validatorMiddleWare = require("../../middlewares/validatorMiddleWare");
const userModel = require("../../models/userModel");
const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

exports.getUserValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];
exports.addUserValidator = [
  check("name")
    .notEmpty()
    .withMessage("name Required")
    .isLength({ min: 3 })
    .withMessage(`Too short  Name`)
    .isLength({ max: 32 })
    .withMessage(`Too long  Name`),
  check(`category`).notEmpty().withMessage("Category Required"),
  check("email")
    .notEmpty()
    .withMessage("email Required")
    .isEmail()
    .withMessage("invalid mail")
    .custom((val) =>
      userModel.findOne({ email: val }).then((user) => {
        if (user) {
          return promise.reject(new Error("E-mail in user"));
        }
      })
    ),
  check("phone")
    .notEmpty()
    .withMessage("phone Required")
    .isLength({ min: 11 })
    .withMessage(`invalid number`)
    .isMobilePhone(["ar-EG", "ar-SA"]),
  check("password")
    .notEmpty()
    .withMessage("passowrd Required")
    .isLength({ min: 6 })
    .withMessage("password is too short")
    .custom((password, { req }) => {
      console.log(password);
      console.log(req.body.passwordConfirm);
      if (password !== req.body.passwordConfirm) {
        throw new Error("Password Confirmation incorrect");
      }
      return true;
    }),
  check("passwordConfirm").notEmpty().withMessage("passowrd Required"),
  validatorMiddleWare,
];
exports.updateUserValidator = [
  check("id").isMongoId().withMessage("Invalid ID format"),
  check("name").optional(),
  // check("email").optional(),
  // check("phone").optional(),
  check("password")
    .optional()
    .custom(async (val, { req }) => {
      req.body.password = await bcrypt.hash(val, 12);
      console.log(req.body.password);
      return true;
    }),
  validatorMiddleWare,
];
exports.deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  validatorMiddleWare,
];

exports.changeUserPasswordValidator = [
  check("id").isMongoId().withMessage("Invalid ID formate"),
  check("currentPassword").notEmpty().withMessage("currentPassword required"),
  check("passwordConfirm").notEmpty().withMessage("passwordConfirm required"),
  check("password")
    .notEmpty()
    .withMessage("Password Required")
    .custom(async (val, { req }) => {
      // 1- Verify current password
      const user = await userModel.findById(req.params.id);
      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error(`Incorrect current password`);
      }
      // 2- Verify confirmation password
      if (val !== req.body.passwordConfirm) {
        throw new Error(`Password confirmation is incorrect`);
      }
      return true;
    }),

  validatorMiddleWare,
];

exports.changeLoggedUserPassValidator = [
  check("currentPassword").notEmpty().withMessage("currentPassword required"),
  check("passwordConfirm").notEmpty().withMessage("passwordConfirm required"),
  check("password")
    .notEmpty()
    .withMessage("Password Required")
    .custom(async (val, { req }) => {
      // 1- Verify current password
      const user = await userModel.findById(req.user._id);

      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );
      if (!isCorrectPassword) {
        throw new Error(`Incorrect current password`);
      }
      // 2- Verify confirmation password
      if (val !== req.body.passwordConfirm) {
        throw new Error(`Password confirmation is incorrect`);
      }
      return true;
    }),

  validatorMiddleWare,
];

exports.updateLoggedUserValidator = [
  body("name").optional(),
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email formate")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error(`E-mail already in use`));
        }
      })
    ),
  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("accept only egypt phone numbers"),
  validatorMiddleWare,
];
