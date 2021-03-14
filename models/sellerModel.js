const mongoose = require("mongoose");

const addressInfo = {
  street: String,
  aptName: String,
  locality: String,
  zip: String,
  lat: Number,
  lng: Number,
  phoneNo: Number,
};

const sellerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    tags: {
      type: String,
      required: true,
    },
    formattedAddress: {
      type: String,
      required: true,
    },
    imageUrl: [
      {
        type: String,
        required: true,
      },
    ],
    address: addressInfo,
    minOrderAmount: Number,
    costForOne: Number,
    payment: [
      {
        type: String,
        required: true,
      },
    ],
    account: { type: mongoose.Types.ObjectId, required: true, ref: "account" },
    items: [{ type: mongoose.Types.ObjectId, ref: "item" }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("seller", sellerSchema);
