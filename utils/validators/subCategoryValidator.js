const { check } = require("express-validator");
const validatorMiddleWare = require("../../middlewares/validatorMiddleWare");

exports.getSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];

exports.createSubCategoryValidator = [
  check("title")
    .notEmpty()
    .withMessage("SubCategory title is required")
    .isLength({ min: 3, max: 32 })
    .withMessage("SubCategory title must be between 3 and 32 characters"),
  check("description").notEmpty().withMessage("Description is required"),
  check("price")
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  check("category")
    .notEmpty()
    .withMessage("Category is required")
    .isMongoId()
    .withMessage("Invalid Category ID"),
  validatorMiddleWare,
];

exports.updateSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  check("title")
    .optional()
    .isLength({ min: 3, max: 32 })
    .withMessage("SubCategory title must be between 3 and 32 characters"),
  check("description")
    .optional()
    .notEmpty()
    .withMessage("Description is required"),
  check("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  check("category").optional().isMongoId().withMessage("Invalid Category ID"),
  validatorMiddleWare,
];

exports.deleteSubCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];
