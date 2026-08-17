const express = require("express");

const {
    queryChat,
} = require("../controllers/chat.controller");

const router = express.Router();

router.post("/query", queryChat);

module.exports = router;
