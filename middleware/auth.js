const jwt = require("jsonwebtoken");
const Account = require("../models/accountModel");

const verifyToken = (req, res) => {
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

  return decodedToken.accountId;
};

module.exports.verifySeller = (req, res, next) => {
  const accountId = verifyToken(req, res);
  Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("内部サーバーエラー");
        error.statusCode = 500;
        throw error;
      }
      if (account.role !== "ROLE_SELLER") {
        const error = new Error("禁止されたアクセスです。");
        error.statusCode = 403;
        throw error;
      }
      req.loggedInUserId = accountId;
      next();
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.verifyUser = (req, res, next) => {
  const accountId = verifyToken(req, res);
  Account.findById(accountId)
    .then((account) => {
      if (!account) {
        const error = new Error("内部サーバーエラー");
        error.statusCode = 500;
        throw error;
      }
      if (account.role !== "ROLE_USER") {
        const error = new Error("禁止されたアクセスです。");
        error.statusCode = 403;
        throw error;
      }
      req.loggedInUserId = accountId;
      next();
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
