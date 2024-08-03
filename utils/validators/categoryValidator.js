const { check } = require("express-validator");
const validatorMiddleWare = require("../../middlewares/validatorMiddleWare");

exports.getCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];
exports.createCategoryValidator = [
  check("name")
    .notEmpty()
    .withMessage("Category Required")
    .isLength({ min: 3 })
    .withMessage(`Too short Category Name`)
    .isLength({ max: 32 })
    .withMessage(`Too long Category Name`),
  // check("description").notEmpty(,
  validatorMiddleWare,
];
exports.updateCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];
exports.deleteCategoryValidator = [
  check("id").isMongoId().withMessage("Invalid Id"),
  validatorMiddleWare,
];
