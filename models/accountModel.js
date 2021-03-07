const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["ROLE_USER", "ROLE_ADMIN", "ROLE_SELLER"],
      required: true,
    },
    accountVerifyToken: String,
    accountVerifyTokenExpiration: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("account", accountSchema);
