const Joi = require("joi");
const prisma = require("../config/prismaClient"); // Adjust as per your file structure

// Validation schemas
const createStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid("STORE_OWNER", "ADMIN").required(),
  email: Joi.string().email().optional(),
  address: Joi.string().min(5).max(200).required(),
  ownerId: Joi.number().integer().optional(), // For admin creating stores
});

const updateStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().min(5).max(200).optional(),
});

const getCommonLength = async (req, res) => {
  try {
    const store = await prisma.store.findMany();
    const users = await prisma.user.findMany();
    const ratings = await prisma.rating.findMany();
    return res.json({
      storeCount: store?.length || 0,
      userCount: users?.length || 0,
      ratingCount: ratings?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching counts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllStores = async (req, res) => {
  try {
    // const page = Math.max(1, parseInt(req.query.page)) || 1;
    // const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    // const skip = (page - 1) * limit;
    // const search = req.query.search || "";
    // const category = req.query.category || "";
    // const sortBy = req.query.sortBy || "createdAt";
    // const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    // const where = {
    //   AND: [
    //     ...(search
    //       ? [
    //           {
    //             OR: [
    //               { name: { contains: search, mode: "insensitive" } },
    //               { address: { contains: search, mode: "insensitive" } },
    //               { description: { contains: search, mode: "insensitive" } },
    //             ],
    //           },
    //         ]
    //       : []),
    //     ...(category
    //       ? [{ category: { contains: category, mode: "insensitive" } }]
    //       : []),
    //   ],
    // };

    const stores = await prisma.store.findMany();

    const storesWithAvgRating = stores.map((store) => {
      // const totalRating = store.ratings.reduce((sum, r) => sum + r.rating, 0);
      // const avgRating =
      //   store.ratings.length > 0 ? totalRating / store.ratings.length : 0;

      return {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        // description: store.description,
        category: store.category,
        owner: store.owner,
        // averageRating: parseFloat(avgRating.toFixed(1)),
        // totalRatings: store._count.ratings,
        createdAt: store.createdAt,
      };
    });

    // const totalStores = await prisma.store.count({ where });

    return res.json({
      stores: storesWithAvgRating,
      // pagination: {
      //   page,
      //   limit,
      //   // total: totalStores,
      //   pages: Math.ceil(totalStores / limit),
      // },
    });
  } catch (error) {
    console.error("Get stores error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const createNewStore = async (req, res) => {
  try {
    const { error, value } = createStoreSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    if (value.role === "NORMAL_USER") {
      return res
        .status(403)
        .json({ message: "Only store owners and admins can create stores" });
    }

    // let ownerId = req.user.id;
    if (value.role === "ADMIN") {
      ownerId = value.ownerId;
    }

    const store = await prisma.store.create({
      data: {
        name: value.name,
        email: value.email,
        address: value.address,
        ownerId,
      }
    });

    return res.status(201).json({
      message: "Store created successfully",
      store,
    });
  } catch (error) {
    console.error("Create store error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const updateNewStore = async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const { error, value } = updateStoreSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!existingStore) {
      return res.status(404).json({ message: "Store not found" });
    }

    if (req.user.role !== "ADMIN" && existingStore.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own stores" });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: value,
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    return res.json({
      message: "Store updated successfully",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Update store error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteStore = async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    if (isNaN(storeId)) {
      return res.status(400).json({ message: "Invalid store ID" });
    }

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!existingStore) {
      return res.status(404).json({ message: "Store not found" });
    }

    if (req.user.role !== "ADMIN" && existingStore.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own stores" });
    }

    await prisma.store.delete({ where: { id: storeId } });

    return res.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Delete store error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getAllStores,
  createNewStore,
  updateNewStore,
  deleteStore,
  getCommonLength
};
