const router = require("express").Router();
const { body } = require("express-validator");

const userCtrl = require("../controllers/userCtrl");
const auth = require("../middleware/auth");

router.post(
  "/user/address",
  auth.verifyUser,
  [
    body("phoneNo", "有効な10桁の電話番号を入力してください。")
      .trim()
      .isLength({ min: 10, max: 10 }),
    body("locality", "都道府県の入力は必須です。").trim().not().isEmpty(),
    body("zip", "郵便番号の入力は必須です。").trim().not().isEmpty(),
    body("street", "住所の入力は必須です。").trim().not().isEmpty(),
  ],
  userCtrl.postAddress
);

router.get('/user', userCtrl.getLoggedInUser)

module.exports = router;
