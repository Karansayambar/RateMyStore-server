const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const {
  createRating,
  getUserRatingOfSpesificStore,
  getAllRating,
  updateRating,
  deleteRating,
} = require("../controllers/rating.controller");
const { getUserRating } = require("../controllers/user.controller");
const ratingRouter = express.Router();

ratingRouter.post("/", verifyToken, createRating);
ratingRouter.get("/store:storeId", verifyToken, getUserRatingOfSpesificStore);
ratingRouter.get("/store/:storeId/all", verifyToken, getAllRating);
ratingRouter.put("/:id", verifyToken, updateRating);
ratingRouter.get("/my-ratings", verifyToken, getUserRating);
ratingRouter.delete("/:id", verifyToken, deleteRating);

module.exports = ratingRouter;
