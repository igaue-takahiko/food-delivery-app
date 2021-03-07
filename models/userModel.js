const mongoose = require("mongoose");

const deliveryInfo = {
  street: String,
  locality: String,
  aptName: String,
  zip: String,
  phoneNo: Number,
  lat: Number,
  lng: Number,
};

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    formattedAddress: {
      type: String,
    },
    address: deliveryInfo,
    account: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "account",
    },
    cart: {
      items: [
        {
          _id: false,
          itemId: {
            type: mongoose.Types.ObjectId,
            ref: "item",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.addToCart = function (item) {
  const cartItemIndex = this.cart.items.findIndex((cp) => {
    return cp.itemId.toString() === item._id.toString()
  })
  let newQuantity = 1
  const updatedCartItems = [...this.cart.items]

  if (cartItemIndex >= 0) {
    newQuantity = this.cart.items[cartItemIndex].quantity + 1
    updatedCartItems[cartItemIndex].quantity = newQuantity
  } else {
    updatedCartItems.push({
      itemId: item._id,
      quantity: newQuantity
    })
  }
  const updatedCart = { items: updatedCartItems }
  this.cat = updatedCart
  return this.save()
}

module.exports = mongoose.model("user", userSchema);
