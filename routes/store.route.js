const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const {
  getAllStores,
  createNewStore,
  updateNewStore,
  deleteStore,
} = require("../controllers/store.controller");
const storeRouter = express.Router();

storeRouter.get("/", getAllStores);
storeRouter.post("/", verifyToken, createNewStore);
storeRouter.put("/:id", verifyToken, updateNewStore);
storeRouter.delete("/:id", verifyToken, deleteStore);

module.exports = storeRouter;
