const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      minLength: [3, "Too short subCategory name"],
      maxLength: [100, "Too long subCategory name"],
    },
    // slug: {
    //   type: String,
    //   lowercase: true,
    //   unique: true,
    // },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be a positive number"],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    section: {
      type: mongoose.Schema.ObjectId,
      ref: "Section",
      required: [true, "Section is required"],
    },
    doors: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Door",
      },
    ],
    image: {
      type: String, 
    },
    totalQuestions: {
      type: Number,
      default: 0, 
    },
    totalHours: {
      type: Number,
      default: 0, 
    },
  },
  { timestamps: true }
);
const setImageUrl = (doc) => {
  if (doc.image && !doc.image.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/courses/${doc.image}`;
    doc.image = imageUrl;
  }
};

subCategorySchema.post("init", (doc) => {
  setImageUrl(doc);
});

subCategorySchema.post("save", (doc) => {
  setImageUrl(doc);
});

const subCategoryModel = mongoose.model("subCategory", subCategorySchema);
module.exports = subCategoryModel;
