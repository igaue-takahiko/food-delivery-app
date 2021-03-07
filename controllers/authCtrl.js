const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const jwt = require("jsonwebtoken");

const User = require("../models/userModel");
const Account = require("../models/accountModel");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SEND_GRID_KEY,
    },
  })
);

module.exports.signupUser = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(
      "バリデーションに失敗しました。間違ったデータが入力されました。"
    );
    error.statusCode = 442;
    error.errors = errors.array();
    throw error;
  }

  const { email, firstName, lastName, password, role } = req.body;
  let token;
  if (role !== "ROLE_USER") {
    const error = new Error(
      "ユーザーのサインアップには、ROLE_USERの役割が必要です。"
    );
    error.statusCode = 500;
    throw error;
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      token = crypto.randomBytes(32).toString("hex");

      const account = new Account({
        role,
        email,
        password: hashPassword,
        accountVerifyToken: token,
        accountVerifyTokenExpiration: Date.now() + 3600000,
      });
      return account.save();
    })
    .then((savedAccount) => {
      const user = new User({
        firstName,
        lastName,
        account: savedAccount,
      });
      return user.save();
    })
    .then((savedUser) => {
      transporter.sendMail({
        to: email,
        from: "superuser@gmail.com",
        subject: "DeliveryHubでアカウントを確認してください。",
        html: `
        <p>以下のリンクをクリックしてメールアドレスを確認してください。</p>
        <p>こちらの<a href="${process.env.BASE_URL}/auth/verify/${token}">リンク</a>をクリックしてアカウントを確認できます。</p>
      `,
      });
      res.status(201).json({
        message:
          "ユーザーが正常にサインアップしました。ログインする前にメールアドレスを確認してください。",
        userId: savedUser._id,
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.verifyAccount = (req, res, next) => {
  const token = req.params.token;
  Account.findOne({
    accountVerifyToken: token,
    accountVerifyTokenExpiration: { $gt: Date.now() },
  })
    .then((account) => {
      if (!account) {
        const error = new Error(
          "URLのトークンは強化されています。不正にアクセスしないでください。"
        );
        error.statusCode = 400;
        throw error;
      }
      account.isVerified = true;
      account.accountVerifyToken = undefined;
      account.accountVerifyTokenExpiration = undefined;
      return account.save();
    })
    .then((account) => {
      res.json({ message: "アカウントが正常に確認されました。" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.login = (req, res, next) => {
  const { email, password } = req.body;
  let loadedUser;

  Account.findOne({ email })
    .then((account) => {
      if (!account) {
        const error = new Error(
          "一致するメールアドレスとパスワードがありません。"
        );
        error.statusCode = 401;
        throw error;
      }
      loadedUser = account;
      return bcrypt.compare(password, account.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error(
          "一致するメールアドレスとパスワードがありません。"
        );
        error.statusCode = 401;
        throw error;
      }

      if (loadedUser.isVerified === false) {
        const error = new Error(
          "プラットフォームにアクセスする前にメールを確認してください。"
        );
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        { accountId: loadedUser._id.toString() },
        "supersecretkey-foodWebApp",
        { expiresIn: "10h" }
      );
      res.status(200).json({ message: "ログインに成功しました。", token });
    })
    .catch((error) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

module.exports.signupSeller = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error(
      "バリデーションに失敗しました。間違ったデータが入力されました。"
    );
    error.statusCode = 422;
    error.errors = errors.array();
    throw error;
  }

  if (req.files.length === 0) {
    const error = new Error("画像もアップロードしてください。");
    error.statusCode = 422;
    throw error;
  }

  const {
    name,
    email,
    password,
    tags,
    role,
    payment,
    minOrderAmount,
    costForOne,
    phoneNo,
    street,
    aptName,
    formattedAddress,
    lat,
    lng,
    locality,
    zip,
  } = req.body;
  const paymentArray = payment.split(" ");
  const arrayFiles = req.files.map((file) => file.path);
  let token;

  if (role !== "ROLE_SELLER") {
    const error = new Error(
      "お店様用のサインアップには、ROLE_SELLERの役割が必要です。"
    );
    error.statusCode = 500;
    throw error;
  }

  bcrypt
    .hash(password, 12)
    .then((hashPassword) => {
      token = crypto.randomBytes(32).toString("hex");

      const account = new Account({
        role,
        email,
        password: hashPassword,
        accountVerifyToken: token,
        accountVerifyTokenExpiration: Date.now() + 3600000,
      });
      return account.save();
    })
    .then((savedAccount) => {
      const seller = new Account({
        name,
        tags,
        imageUrl: arrayFiles,
        minOrderAmount,
        costForOne,
        account: savedAccount,
        payment: paymentArray,
        formattedAddress,
        address: {
          street,
          zip,
          phoneNo,
          locality,
          aptName,
          lat,
          lng,
        },
      });
      return seller.save();
    })
    .then((savedSeller) => {
      transporter.sendMail({
        to: email,
        from: "superuser@gmail.com",
        subject: "DeliveryHubでアカウントを確認してください。",
        html: `
        <p>以下のリンクをクリックしてメールアドレスを確認してください。</p>
        <p>こちらの<a href="${process.env.BASE_URL}/auth/verify/${token}">リンク</a>をクリックしてアカウントを確認できます。</p>
        `,
      });
      res.status(201).json({
        message:
          "お店様用の正常にサインアップしました。ログインする前にメールアドレスを確認してください。",
        sellerId: savedSeller._id,
      });
    })
    .catch((error) => {
      if (!error.statusCode) error.statusCode = 500;
      next(error);
    });
};

module.exports.imagesTest = (req, res, next) => {
  if (!req.files) {
    const error = new Error("画像もアップロードしてください。");
    error.statusCode = 422;
    throw error;
  }

  const arrayFiles = req.files.map((file) => file.path);
  console.log(arrayFiles);

  return res.status(200).json({ message: "Success!" });
};
