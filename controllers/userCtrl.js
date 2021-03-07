const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const Account = require("../models/accountModel");
const io = require("../utils/socket");
const server = require("../server");

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

  Account.findById(accountId).then((account) => {
    if (!account) {
      const error = new Error("Internal server error");
      error.statusCode = 500;
      throw error;
    }
    accountObj = account
    return User.findOne({ account: account._id }).populate({
      path: "account",
      select: ["email", "role"]
    })
  }).then((user) => {
    if (user) {
      return user
    } else {
      return
    }
  }).then((result) => {
    res.json({ result })
  }).catch((error) => {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  });
};
