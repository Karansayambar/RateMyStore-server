const Joi = require("joi");
const prisma = require("../config/prismaClient");
const { verifyToken } = require("../middleware/auth");

// Validation schemas
const createRatingSchema = Joi.object({
  storeId: Joi.number().integer().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
});

const updateRatingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
});

const createRating = async (req, res) => {
  try {
    const { error, value } = createRatingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { storeId, rating, comment } = value;

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Check if user is trying to rate their own store
    if (store.ownerId === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot rate your own store" });
    }

    // Check if rating already exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        userId_storeId: {
          userId: req.user.id,
          storeId: storeId,
        },
      },
    });

    let ratingRecord;
    if (existingRating) {
      // Update existing rating
      ratingRecord = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { rating, comment },
        include: {
          store: {
            select: { name: true },
          },
          user: {
            select: { name: true },
          },
        },
      });
    } else {
      // Create new rating
      ratingRecord = await prisma.rating.create({
        data: {
          userId: req.user.id,
          storeId,
          rating,
          comment,
        },
        include: {
          store: {
            select: { name: true },
          },
          user: {
            select: { name: true },
          },
        },
      });
    }

    res.status(existingRating ? 200 : 201).json({
      message: existingRating
        ? "Rating updated successfully"
        : "Rating created successfully",
      rating: ratingRecord,
    });
  } catch (error) {
    console.error("Create/Update rating error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's rating for a specific store

const getUserRatingOfSpesificStore = async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);

    const rating = await prisma.rating.findUnique({
      where: {
        userId_storeId: {
          userId: req.user.id,
          storeId: storeId,
        },
      },
      include: {
        store: {
          select: { name: true },
        },
      },
    });

    res.json({ rating });
  } catch (error) {
    console.error("Get user rating error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllRating = async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    const ratings = await prisma.rating.findMany({
      where: { storeId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalRatings = await prisma.rating.count({
      where: { storeId },
    });

    // Calculate average rating
    const avgRating = await prisma.rating.aggregate({
      where: { storeId },
      _avg: { rating: true },
    });

    res.json({
      ratings,
      averageRating: avgRating._avg.rating || 0,
      totalRatings,
      pagination: {
        page,
        limit,
        total: totalRatings,
        pages: Math.ceil(totalRatings / limit),
      },
    });
  } catch (error) {
    console.error("Get store ratings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateRating = async (res, res) => {
  try {
    const ratingId = parseInt(req.params.id);
    const { error, value } = updateRatingSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if rating exists and belongs to user
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!existingRating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    if (existingRating.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own ratings" });
    }

    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: value,
      include: {
        store: {
          select: { name: true },
        },
        user: {
          select: { name: true },
        },
      },
    });

    res.json({
      message: "Rating updated successfully",
      rating: updatedRating,
    });
  } catch (error) {
    console.error("Update rating error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteRating = async (req, res) => {
  try {
    const ratingId = parseInt(req.params.id);

    // Check if rating exists and belongs to user
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!existingRating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    if (existingRating.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ message: "You can only delete your own ratings" });
    }

    await prisma.rating.delete({
      where: { id: ratingId },
    });

    res.json({ message: "Rating deleted successfully" });
  } catch (error) {
    console.error("Delete rating error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUsersRating = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ratings = await prisma.rating.findMany({
      where: { userId: req.user.id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalRatings = await prisma.rating.count({
      where: { userId: req.user.id },
    });

    res.json({
      ratings,
      pagination: {
        page,
        limit,
        total: totalRatings,
        pages: Math.ceil(totalRatings / limit),
      },
    });
  } catch (error) {
    console.error("Get my ratings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getAllRating,
  getUserRatingOfSpesificStore,
  getUsersRating,
  createRating,
  updateRating,
  deleteRating,
};
