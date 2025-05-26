const express = require("express");
const Joi = require("joi");
const prisma = require("../config/prismaClient");

// Validation schemas
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .pattern(
      new RegExp(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]"
      )
    )
    .required(),
  address: Joi.string().max(200).optional(),
  role: Joi.string().valid("ADMIN", "NORMAL_USER", "STORE_OWNER").required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().max(200).optional(),
  role: Joi.string().valid("ADMIN", "NORMAL_USER", "STORE_OWNER").optional(),
});

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password, address, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Hash password
    // const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        address,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllStoresForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const stores = await prisma.store.findMany({
      where,
      include: {
        owner: {
          select: { name: true, email: true },
        },
        ratings: {
          select: { rating: true },
        },
        _count: {
          select: { ratings: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
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
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        phone: store.phone,
        description: store.description,
        category: store.category,
        owner: store.owner,
        averageRating: parseFloat(avgRating.toFixed(1)),
        totalRatings: store._count.ratings,
        createdAt: store.createdAt,
      };
    });

    const totalStores = await prisma.store.count({ where });

    res.json({
      stores: storesWithAvgRating,
      pagination: {
        page,
        limit,
        total: totalStores,
        pages: Math.ceil(totalStores / limit),
      },
    });
  } catch (error) {
    console.error("Get admin stores error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUserByAdmin = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { error, value } = updateUserSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it's already taken
    if (value.email && value.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: value.email },
      });

      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: value,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        phone: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const role = req.query.role || "";

    // Build where clause
    const where = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        role ? { role } : {},
      ],
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        address: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            ratings: true,
            stores: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalUsers = await prisma.user.count({ where });

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  createUser,
  getAllStoresForAdmin,
  deleteUserByAdmin,
  updateUser,
  getAllUsers,
};