const router = require("express").Router();
const { body } = require("express-validator");

const itemCtrl = require("../controllers/itemCtrl");
const auth = require("../middleware/auth");

router.post(
  "/create-item",
  auth.verifySeller,
  [
    body("title", "タイトルは入力は必須です。").trim().not().isEmpty(),
    body("description", "商品説明の入力は必須です。").trim().not().isEmpty(),
    body("price", "価格の入力は必須です。").trim().not().isEmpty(),
  ],
  itemCtrl.createItem
);

router.put(
  "/edit-item/:itemId",
  auth.verifySeller,
  [
    body("title", "タイトルは入力は必須です。").trim().not().isEmpty(),
    body("description", "商品説明の入力は必須です。").trim().not().isEmpty(),
    body("price", "価格の入力は必須です。").trim().not().isEmpty(),
  ],
  itemCtrl.editItem
);

router.delete("/delete-item/:itemId", auth.verifySeller, itemCtrl.deleteItem);

router.get("/get-items", auth.verifySeller, itemCtrl.getItems);

router.get("/get-item/:itemId", auth.verifySeller, itemCtrl.getItem);

module.exports = router;
