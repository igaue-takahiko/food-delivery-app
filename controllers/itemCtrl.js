const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");

const Item = require("../models/itemModel");
const Seller = require("../models/sellerModel");
const Account = require("../models/accountModel");

const clearImage = (filepath) => {
  filepath = path.join(__dirname, "../", filepath);
  fs.unlink(filepath, (error) => {
    console.log(error);
  });
};

module.exports.createItem = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 442;
    error.errors = errors.array();
    throw error;
  }

  if (!req.file) {
    const error = new Error("画像をアップロードしてください。");
    error.statusCode = 422;
    throw error;
  }

  const { title, price, tags, description } = req.body;
  const imageUrl = req.file.path;
  let creator;

  Account.findById(req.loggedInUserId)
    .then((account) => {
      return Seller.findOne({ account: account._id });
    })
    .then((seller) => {
      creator = seller;

      const item = new Item({
        title,
        imageUrl,
        description,
        price,
        tags,
        creator: creator._id,
      });

      item
        .save()
        .then((savedItem) => {
          seller.items.push(item);
          return seller.save();
        })
        .then((updatedSeller) => {
          res.status(201).json({
            message: "商品が登録されました。",
            item,
            creator: { _id: creator._id, name: creator.name },
          });
        });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.editItem = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation Failed, Incorrect data entered.");
    error.statusCode = 422;
    error.errors = errors.array();
    throw error;
  }

  const { title, price, tags, description } = req.body;
  const { itemId } = req.params;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error(
      "画像が見つかりませんでした。もう一度やり直してください。"
    );
    error.statusCode = 404;
    throw error;
  }

  Item.findById(itemId)
    .then((fetchedItem) => {
      if (!fetchedItem) {
        const error = new Error(
          "Could not find any Item with the given itemId."
        );
        error.statusCode = 404;
        throw error;
      }

      if (imageUrl !== fetchedItem.imageUrl) {
        clearImage(fetchedItem.imageUrl);
      }

      fetchedItem.title = title;
      fetchedItem.description = description;
      fetchedItem.price = price;
      fetchedItem.tags = tags;
      fetchedItem.imageUrl = imageUrl;

      return fetchedItem.save();
    })
    .then((updatedImage) => {
      res.status(200).json({
        message: "商品がアップデートされました。",
        item: updatedImage,
      });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.deleteItem = (req, res, next) => {
  const { itemId } = req.params;
  Item.findById(itemId)
    .then((item) => {
      if (!item) {
        const error = new Error(
          "Could not find any Item with the given itemId."
        );
        error.statusCode = 404;
        throw error;
      }

      clearImage(item.imageUrl);

      return Item.findByIdAndRemove(itemId);
    })
    .then((deleteItem) => {
      return Account.findById(req.loggedInUserId);
    })
    .then((account) => {
      return Seller.findOne({ account: account._id });
    })
    .then((seller) => {
      seller.items.pull(itemId);
      return seller.save();
    })
    .then((result) => {
      res.status(200).json({ message: "商品が正常に削除しました。" });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getItems = (req, res, next) => {
  Account.findById(req.loggedInUserId)
    .then((account) => {
      return Seller.findOne({ account: account._id });
    })
    .then((seller) => {
      return Item.find({ _id: { $in: seller.items } });
    })
    .then((items) => {
      res.json({ items });
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};

module.exports.getItem = (req, res, next) => {
  const { itemId } = req.params;
  Item.findById(itemId)
    .then((item) => {
      if (!item) {
        const error = new Error("指定された商品が見つかりませんでした。");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: "商品が見つかりました。", item });
    })
    .catch((error) => {
      if (error.statusCode) {
        error.statusCode = 500;
      }
      next(error);
    });
};
