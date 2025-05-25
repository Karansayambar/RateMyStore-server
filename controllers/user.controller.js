const Joi = require("joi");
const prisma = require("../config/prismaClient");
const { verifyToken } = require("../middleware/verifyToken");
// Validation schemas
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  address: Joi.string().max(200).optional(),
  phone: Joi.string().max(20).optional(),
});

// get user profile

const getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// update user profile
const updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: value,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const userStatistic = async (req, res) => {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        _count: {
          select: {
            ratings: true,
            stores: true,
          },
        },
      },
    });

    // Get average rating given by user
    const avgRating = await prisma.rating.aggregate({
      where: { userId: req.user.id },
      _avg: { rating: true },
    });

    res.json({
      totalRatings: stats._count.ratings,
      totalStores: stats._count.stores,
      averageRatingGiven: avgRating._avg.rating || 0,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's stores (for store owners)

const getStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { ownerId: req.user.id },
      include: {
        ratings: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        _count: {
          select: { ratings: true },
        },
      },
    });

    // Calculate average rating for each store
    const storesWithAvgRating = stores.map((store) => {
      const totalRating = store.ratings.reduce(
        (sum, rating) => sum + rating.rating,
        0
      );
      const avgRating =
        store.ratings.length > 0 ? totalRating / store.ratings.length : 0;

      return {
        ...store,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalRatings: store._count.ratings,
      };
    });

    res.json({ stores: storesWithAvgRating });
  } catch (error) {
    console.error("Get my stores error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user's ratings
const getUserRating = async (req, res) => {
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
  updateProfile,
  getUserProfile,
  getStores,
  getUserRating,
  userStatistic,
};
