const pash = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use((error, req, res, next) => {
  console.log(error + "---------------------");
  const statusCode = error.statusCode || 500;
  const message = error.message;
  let errorPresent;
  if (error.errors) {
    errorPresent = error.errors;
  }

  res.status(statusCode).json({
    message: message,
    errors: errorPresent,
  });
});

const clients = {};

const URL = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.rhry1.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`;
mongoose
  .connect(URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then((result) => {
    console.log("connected to mongoDB.");
    const port = process.env.PORT || 8000;
    const server = app.listen(port, () => {
      console.log("Server is running on port.", port);
    });

    const io = require("./utils/socket").init(server);
    io.on("connection", (socket) => {
      socket.on("add-user", (data) => {
        clients[data.userId] = {
          socket: socket.id,
        };
      });

      //切断時にsocketを取り外す。
      socket.on("disconnect", () => {
        for (const userId in clients) {
          if (clients[userId].socket === socket.id) {
            delete clients[userId];
            break;
          }
        }
      });
    });
  })
  .catch((error) => console.log(error));

exports.clients = clients;
