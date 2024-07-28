const mongoose = require("mongoose");

const doorSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    subCategory: {
    
      type: mongoose.Schema.ObjectId,
      ref: "subCategory", 
      required: true,
    },
    lessons: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Lesson", 
      },
    ],
  },
  { timestamps: true }
);

const DoorModel = mongoose.model("Door", doorSchema);

module.exports = DoorModel;
