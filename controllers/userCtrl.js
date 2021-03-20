const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const Account = require("../models/accountModel");
const Seller = require("../models/sellerModel");
const Item = require("../models/itemModel");
const Order = require("../models/orderModel");
const io = require("../utils/socket");
const server = require("../server");

module.exports.postCart = async (req, res, next) => {
  const { itemId } = req.body;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }

  let targetItem;
  await Item.findById(itemId)
    .then((item) => {
      targetItem = item;
      return Account.findById(req.loggedInUserId);
    })
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.addToCart(targetItem);
    })
    .then((result) => {
      res.status(200).json({ message: "商品がカートに正常に追加されました。" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getCart = async (req, res, next) => {
  await Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.populate("cart.items.itemId").execPopulate();
    })
    .then((user) => {
      const cartItems = user.cart.items;
      let totalPrice = 0;
      cartItems.forEach((item) => {
        totalPrice = totalPrice + item.quantity * item.itemId.price;
      });
      res.json({ cart: cartItems, totalPrice });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.postCartRemove = async (req, res, next) => {
  const { itemId } = req.params;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }

  await Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.reduceQuantity(itemId);
    })
    .then((result) => {
      res.status(200).json({ message: "商品が正常に更新されました。" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.postCartDelete = async (req, res, next) => {
  const { itemId } = req.body;
  if (!itemId) {
    const error = new Error("ItemId not provided");
    error.statusCode = 404;
    throw error;
  }

  await Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return user.removeFromCart(itemId);
    })
    .then((result) => {
      res.status(200).json({ message: "商品は正常に削除されました。" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getRestaurants = async (req, res, next) => {
  await Seller.find()
    .populate("account", "isVerified")
    .sort({ createdAt: -1 })
    .then((sellers) => {
      const sellersFinal = sellers.filter((restaurant) => {
        return restaurant.account.isVerified === true;
      });
      res.status(200).json({
        restaurants: sellersFinal,
        totalItems: sellersFinal.length,
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getRestaurant = async (req, res, next) => {
  const { restId } = req.params;
  await Seller.findById(restId)
    .populate("items")
    .then((restaurant) => {
      res.json({ result: restaurant });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.postAddress = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 442;
    error.errors = errors.array();
    throw error;
  }

  const {
    phoneNo,
    street,
    locality,
    aptName,
    zip,
    lat,
    lng,
    formattedAddress,
  } = req.body;
  Account.findById(req.loggedInUserId)
    .then((account) => {
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      return User.findByIdAndUpdate(
        { _id: user._id },
        {
          address: {
            street,
            locality,
            zip,
            phoneNo,
            aptName,
            lat,
            lng,
          },
          formattedAddress,
        },
        { new: true }
      );
    })
    .then((result) => {
      res.json({ item: result });
    });
};

module.exports.postOrder = async (req, res, next) => {
  let accountObj;
  let userObj;
  await Account.findById(req.loggedInUserId)
    .then((account) => {
      accountObj = account;
      return User.findOne({ account: account._id });
    })
    .then((user) => {
      userObj = user;
      return user.populate("cart.items.itemId").execPopulate();
    })
    .then((result) => {
      const sellers = result.cart.items.reduce((acc, item) => {
        if (!acc[item.itemId.creator]) {
          acc[item.itemId.creator] = [];
        }

        acc[item.itemId.creator].push(item);
        return acc;
      }, {});

      for (let [seller, cartItem] of Object.entries(sellers)) {
        Seller.findById(seller).then((seller) => {
          const items = cartItem.map((i) => {
            return { quantity: i.quantity, item: { ...i.itemId._doc } };
          });

          const order = new Order({
            user: {
              email: accountObj.email,
              name: result.lastName,
              address: result.address,
              userId: result,
            },
            items,
            status: "受注する",
            seller: {
              name: seller.name,
              phone: seller.address.phoneNo,
              sellerId: seller,
            },
          });

          order.save();
          for (const clientId of Object.keys(server.clients)) {
            if (clientId.toString() === seller._id.toString()) {
              io.getIo().sockets.connected[
                server.clients[clientId].socket
              ].emit("orders", { action: "create", order });
            }
          }
        });
      }
      return result;
    })
    .then((result) => {
      return userObj.clearCart();
    })
    .then((result) => {
      res.status(200).json({ result });
    })
    .catch((error) => {
      if (error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getOrders = async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  const accountId = decodedToken.accountId;

  await Account.findById(accountId)
    .then((account) => {
      if (account.role === "ROLE_USER") {
        return User.findOne({ account: account._id });
      }

      if (account.role === "ROLE_SELLER") {
        return Seller.findOne({ account: account._id });
      }
    })
    .then((result) => {
      if (result instanceof User) {
        return Order.find({ "user.userId": result._id }).sort({
          createdAt: -1,
        });
      }

      if (result instanceof Seller) {
        return Order.find({ "seller.sellerId": result._id }).sort({
          createdAt: -1,
        });
      }
    })
    .then((orders) => {
      res.status(200).json({ orders });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.postOrderStatus = async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const { orderId } = req.params;
  if (!req.body.status) {
    const error = new Error("Status Not Provided.");
    error.statusCode = 404;
    throw error;
  }

  const { status } = req.body;
  await Order.findById(orderId)
    .then((order) => {
      if (!order) {
        const error = new Error(
          "Could not find any Order with the given orderId."
        );
        error.statusCode = 404;
        throw error;
      }

      order.status = status;
      return order.save();
    })
    .then((updatedOrder) => {
      io.getIo().emit("orders", { action: "update", order: updatedOrder });
      res.status(200).json({ updatedOrder });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getLoggedInUser = async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, "supersecretkey-foodWebApp");
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  const accountId = decodedToken.accountId;
  let accountObj;

  await Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("Internal server error");
        error.statusCode = 500;
        throw error;
      }
      accountObj = account;
      return User.findOne({ account: account._id }).populate({
        path: "account",
        select: ["email", "role"],
      });
    })
    .then((user) => {
      if (user) {
        return user;
      } else {
        return Seller.findOne({ account: accountObj._id })
          .populate("items")
          .populate({ path: "account", select: ["email", "role"] });
      }
    })
    .then((result) => {
      res.json({ result });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getConnectedClients = (req, res, next) => {
  res.json({ clients: server.clients });
};

module.exports.getRestaurantsByAddress = async (req, res, next) => {
  const lat1 = req.params.lat;
  const lon1 = req.params.lng;

  await Seller.find()
    .populate("account", "isVerified")
    .sort({ createdAt: -1 })
    .then((sellers) => {
      const sellersVerified = sellers.filter((restaurant) => {
        return restaurant.account.isVerified === true;
      });

      const sellerFinal = sellersVerified.reduce((result, seller) => {
        const lat2 = seller.address.lat;
        const lon2 = seller.address.lng;

        const R = 6371; // kms
        const result1 = (lat1 * Math.PI) / 180;
        const result2 = (lat2 * Math.PI) / 180;
        const result3 = ((lat2 - lat1) * Math.PI) / 180;
        const result4 = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(result3 / 2) * Math.sin(result3 / 2) +
          Math.cos(result1) *
            Math.cos(result2) *
            Math.sin(result4 / 2) *
            Math.sin(result4 / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const d = R * c; // in km
        if (d < 10) result.push(seller);

        return result;
      }, []);

      return sellerFinal;
    })
    .then((results) => {
      res.status(200).json({
        restaurants: results,
        totalItems: results.length,
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
