const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const {
  getAllStores,
  createNewStore,
  updateNewStore,
  deleteStore,
  getCommonLength,
} = require("../controllers/store.controller");
const storeRouter = express.Router();

storeRouter.get("/", getAllStores);
storeRouter.get("/common-length", getCommonLength);
storeRouter.post("/create-store", createNewStore);
storeRouter.put("/:id", verifyToken, updateNewStore);
storeRouter.delete("/:id", verifyToken, deleteStore);

module.exports = storeRouter;
