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
  Account.findById(req.loggedInUserId).then((user) => {
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
        formattedAddress
      },
      { new: true }
    )
  }).then((result) => {
    res.json({ item: result })
  })
};
