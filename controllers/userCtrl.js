const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const Account = require("../models/accountModel");
const Seller = require("../models/sellerModel");
const io = require("../utils/socket");
const server = require("../server");

module.exports.getRestaurants = (req, res, next) => {
  Seller.find()
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

module.exports.getRestaurant = (req, res, next) => {
  const { restId } = req.params;
  Seller.findById(restId)
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
    const error = new Error(
      "Validation Failed, Incorrect data entered."
    );
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
  let sellerObj;

  Account.findById(accountId)
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
  res.json({ clients: app.clients });
};

module.exports.getRestaurantsByAddress = (req, res, next) => {
  const lat1 = req.params.lat;
  const lon1 = req.params.lng;

  Seller.find()
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
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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
    }).catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
