const router = require("express").Router();
const { body } = require("express-validator");

const userCtrl = require("../controllers/userCtrl");
const auth = require("../middleware/auth");

router.post(
  "/user/address",
  auth.verifyUser,
  [
    body("phoneNo", "電話番号の入力は必須です。").trim().not().isEmpty(),
    body("locality", "都道府県の入力は必須です。").trim().not().isEmpty(),
    body("zip", "郵便番号の入力は必須です。").trim().not().isEmpty(),
    body("street", "住所の入力は必須です。").trim().not().isEmpty(),
  ],
  userCtrl.postAddress
);

router.get("/user", userCtrl.getLoggedInUser);

router.get("/restaurants", userCtrl.getRestaurants);

router.get("/restaurant/:restId", userCtrl.getRestaurant);

router.get("/clients/connected", userCtrl.getConnectedClients);

router.get("/restaurants-location/:lat/:lng", userCtrl.getRestaurantsByAddress);

module.exports = router;
