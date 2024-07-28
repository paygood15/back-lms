const express = require("express");
const {
  addCategory,
  getAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const {
  getCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  createCategoryValidator,
} = require("../utils/validators/categoryValidator");
const subCategoryRoute = require("./subCategoryRoute");
const authController = require("../controllers/authController");

const router = express.Router();
router.use("/:categoryId/subcategories", subCategoryRoute);
router
  .route("/")
  .get(getAllCategories)
  .post(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    createCategoryValidator,
    addCategory
  );
router
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    updateCategoryValidator,
    updateCategory
  )
  .delete(
    authController.auth,
    authController.allowedTo("admin", "manager"),
    deleteCategoryValidator,
    deleteCategory
  );
module.exports = router;
