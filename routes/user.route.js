const express = require("express");
const { verifyToken } = require("../middleware/verifyToken");
const {
  getUserProfile,
  updateProfile,
  userStatistic,
  getStores,
  getAllUsers,
  getUserRating,
} = require("../controllers/user.controller");
const { createUser } = require("../controllers/admin.controller");
const { user } = require("../config/prismaClient");
const userRouter = express.Router();

userRouter.get("/profile", verifyToken, getUserProfile);
userRouter.get("/all-users", getAllUsers);
userRouter.post("/create-user", createUser); //TODO: Create the new router for Admin and add this route to it
userRouter.put("/profile", verifyToken, updateProfile);
userRouter.get("/stats", verifyToken, userStatistic);
userRouter.get("/my-stores", verifyToken, getStores);
userRouter.get("/my-ratings", verifyToken, getUserRating);

module.exports = userRouter;
