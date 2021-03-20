const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        item: { type: Object, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: [
        "受注する",
        "キャンセル",
        "配達中",
        "配達完了",
        "配達済み",
      ],
    },
    user: {
      email: {
        type: String,
        required: true,
      },
      address: {
        type: Object,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "user",
      },
    },
    seller: {
      phone: {
        type: Number,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      sellerId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: "seller",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
