// Validation schemas
const createStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().optional(),
  address: Joi.string().min(5).max(200).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().max(50).optional(),
  ownerId: Joi.number().integer().optional(), // For admin creating stores
});

const updateStoreSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().min(5).max(200).optional(),
  description: Joi.string().max(500).optional(),
  category: Joi.string().max(50).optional(),
});

const getAllStores = async (req, res) => {};
try {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const category = req.query.category || "";
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder || "desc";

  // Build where clause
  const where = {
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      category ? { category: { contains: category, mode: "insensitive" } } : {},
    ],
  };

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
    orderBy: { [sortBy]: sortOrder },
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
  console.error("Get stores error:", error);
  res.status(500).json({ message: "Internal server error" });
}

const createNewStore = async (req, res) => {
  try {
    const { error, value } = createStoreSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Determine owner ID
    let ownerId = req.user.id;
    if (req.user.role === "ADMIN" && value.ownerId) {
      ownerId = value.ownerId;
    }

    // Check if user can create stores
    if (req.user.role === "NORMAL_USER") {
      return res
        .status(403)
        .json({ message: "Only store owners and admins can create stores" });
    }

    const store = await prisma.store.create({
      data: {
        ...value,
        ownerId,
      },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    res.status(201).json({
      message: "Store created successfully",
      store,
    });
  } catch (error) {
    console.error("Create store error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateNewStore = async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    const { error, value } = updateStoreSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!existingStore) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Check permissions
    if (req.user.role !== "ADMIN" && existingStore.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only update your own stores" });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: value,
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    res.json({
      message: "Store updated successfully",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Update store error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteStore = async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!existingStore) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Check permissions
    if (req.user.role !== "ADMIN" && existingStore.ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own stores" });
    }

    await prisma.store.delete({
      where: { id: storeId },
    });

    res.json({ message: "Store deleted successfully" });
  } catch (error) {
    console.error("Delete store error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getAllStores, createNewStore, updateNewStore, deleteStore };
