const express = require("express");
const serverless = require("serverless-http");

const app = express();

app.get("/API/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

module.exports = app;
module.exports.handler = serverless(app);
