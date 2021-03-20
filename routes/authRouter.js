const router = require("express").Router();
const { body } = require("express-validator");

const User = require("../models/userModel");
const Account = require("../models/accountModel");
const authCtrl = require("../controllers/authCtrl");

router.get("/verify/:token", authCtrl.verifyAccount);

router.post(
  "/signup-user",
  [
    body("email", "有効なメールアドレスを入力してください。")
      .isEmail()
      .custom(async (value, { req }) => {
        return await Account.findOne({ email: value }).then((accountDoc) => {
          if (accountDoc) {
            return Promise.reject("すでにそのメールアドレスは使われています。");
          }
        });
      })
      .normalizeEmail(),
    body("password", "パスワードは６文字以上の入力でお願いします。")
      .trim()
      .isLength({ min: 6 }),
    body("firstName", "名字の入力は必須です。").trim().not().isEmpty(),
    body("lastName", "名前の入力は必須です。").trim().not().isEmpty(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("確認用パスワードが一致していません。");
        }
        return true;
      }),
  ],
  authCtrl.signupUser
);

router.post(
  "/signup-seller",
  [
    body("email", "有効なメールアドレスを入力してください。")
      .isEmail()
      .custom(async (value, { req }) => {
        return await Account.findOne({ email: value }).then((accountDoc) => {
          if (accountDoc) {
            return Promise.reject("すでにそのメールアドレスは使われています。");
          }
        });
      })
      .normalizeEmail(),
    body("password", "パスワードは６文字以上の入力でお願いします。")
      .trim()
      .isLength({ min: 6 }),
    body("name", "店舗名の入力は必須です。").trim().not().isEmpty(),
    body("payment", "支払いの入力は必須です。").trim().not().isEmpty(),
    body("tags", "ジャンルの入力は必須です。").trim().not().isEmpty(),
    body("street", "住所の入力は必須です。").trim().not().isEmpty(),
    body("locality", "都道府県の入力は必須です。").trim().not().isEmpty(),
    body("zip", "郵便番号の入力は必須です。").trim().not().isEmpty(),
    body("costForOne", "受注できる人数の入力は必須です。").trim().not().isEmpty(),
    body("minOrderAmount", "最小注文額の注文は必須です。")
      .trim()
      .not()
      .isEmpty(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("確認用パスワードが一致していません。");
        }
        return true;
      }),
    body("phoneNo", "電話番号の入力は必須です。").trim().not().isEmpty(),
  ],
  authCtrl.signupSeller
);

router.post("/login", authCtrl.login);

router.post("/images-test", authCtrl.imagesTest);

module.exports = router;
