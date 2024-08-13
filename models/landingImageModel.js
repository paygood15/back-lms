const mongoose = require("mongoose");

const landingImageSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    image2: {
      type: String,
    },
    image3: {
      type: String,
    },
    image4: {
      type: String,
    },
    text1: {
      type: String,
    },
    text2: {
      type: String,
    },
  },
  { timestamps: true }
);

const setImageUrl = (doc) => {
  if (doc.image && !doc.image.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/home/${doc.image}`;
    doc.image = imageUrl;
  }
};

const setImage2Url = (doc) => {
  if (doc.image2 && !doc.image2.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/home/${doc.image2}`;
    doc.image2 = imageUrl;
  }
};

const setImage3Url = (doc) => {
  if (doc.image3 && !doc.image3.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/home/${doc.image3}`;
    doc.image3 = imageUrl;
  }
};

const setImage4Url = (doc) => {
  if (doc.image4 && !doc.image4.includes(process.env.BASE_URL)) {
    const imageUrl = `${process.env.BASE_URL}/uploads/home/${doc.image4}`;
    doc.image4 = imageUrl;
  }
};

landingImageSchema.post("init", (doc) => {
  setImageUrl(doc, "image");
  setImage2Url(doc, "image2");
  setImage3Url(doc, "image3");
  setImage4Url(doc, "image4");
});

landingImageSchema.post("save", (doc) => {
  setImageUrl(doc, "image");
  setImage2Url(doc, "image2");
  setImage3Url(doc, "image3");
  setImage4Url(doc, "image4");
});

const landingImageModel = mongoose.model("LandingImage", landingImageSchema);
module.exports = landingImageModel;

