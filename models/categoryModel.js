const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, `name is required`],
      unique: [true, `category must be unique`],
      minLength: [3, `Too short Category Name`],
      maxLength: [32, `Too long Category Name`],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      // required: [true, `description is required`],
      maxLength: [255, `Too long Description`],
    },
    subCategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "subCategory", // Ensure this matches the model name
      },
    ],
  },
  { timestamps: true }
);
const CategoryModel = mongoose.model("Category", categorySchema);
module.exports = CategoryModel;
