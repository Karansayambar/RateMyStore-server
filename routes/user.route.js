const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const {
  getUserProfile,
  updateProfile,
  userStatistic,
  getStores,
  getUserRating,
} = require("../controllers/user.controller");
const userRouter = express.Router();

userRouter.get("/profile", verifyToken, getUserProfile);
userRouter.put("/profile", verifyToken, updateProfile);
userRouter.get("/stats", verifyToken, userStatistic);
userRouter.get("/my-stores", verifyToken, getStores);
userRouter.get("/my-ratings", verifyToken, getUserRating);

module.exports = userRouter;
