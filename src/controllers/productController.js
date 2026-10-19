const prisma = require("../config/prisma");

const productInclude = {
  category: {
    select: { id: true, name: true, parentId: true },
  },
  images: {
    orderBy: { sortOrder: "asc" },
  },
};

// ---------- GET /api/products ----------
async function getAll(req, res, next) {
  try {
    const { categoryId, search, type } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: productInclude,
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
}

// ---------- GET /api/products/:id ----------
async function getOne(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

// ---------- POST /api/products ----------
async function create(req, res, next) {
  try {
    const {
      name,
      description = null,
      price,
      stock = 0,
      sku = null,
      categoryId,
      images = [],
      type = "SALE",
      priceUnit = null,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!["SALE", "RENT"].includes(type)) {
      return res.status(400).json({ error: "Type must be SALE or RENT" });
    }
    if (type === "RENT" && !["day", "week", "month"].includes(priceUnit)) {
      return res
        .status(400)
        .json({ error: "Rentals need a price unit (day/week/month)" });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const cleanImages = (Array.isArray(images) ? images : [])
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean);

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: Number(price),
        stock: Number(stock) || 0,
        sku: sku?.trim() || null,
        categoryId,
        type,
        priceUnit: type === "RENT" ? priceUnit : null,
        images: {
          create: cleanImages.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
      include: productInclude,
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// ---------- PATCH /api/products/:id ----------
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      stock,
      sku,
      categoryId,
      images,
      type,
      priceUnit,
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (type !== undefined && !["SALE", "RENT"].includes(type)) {
      return res.status(400).json({ error: "Type must be SALE or RENT" });
    }

    // Determine effective type after update
    const effectiveType = type !== undefined ? type : existing.type;
    const effectiveUnit =
      priceUnit !== undefined ? priceUnit : existing.priceUnit;

    if (
      effectiveType === "RENT" &&
      !["day", "week", "month"].includes(effectiveUnit)
    ) {
      return res
        .status(400)
        .json({ error: "Rentals need a price unit (day/week/month)" });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined)
      data.description = description?.trim() || null;
    if (price !== undefined) data.price = Number(price);
    if (stock !== undefined) data.stock = Number(stock);
    if (sku !== undefined) data.sku = sku?.trim() || null;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (type !== undefined) data.type = type;
    data.priceUnit = effectiveType === "RENT" ? effectiveUnit : null;

    if (Array.isArray(images)) {
      const cleanImages = images
        .map((u) => (typeof u === "string" ? u.trim() : ""))
        .filter(Boolean);

      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: id } }),
        prisma.productImage.createMany({
          data: cleanImages.map((url, index) => ({
            productId: id,
            url,
            sortOrder: index,
          })),
        }),
        prisma.product.update({ where: { id }, data }),
      ]);
    } else {
      await prisma.product.update({ where: { id }, data });
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ---------- DELETE /api/products/:id ----------
async function remove(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.product.delete({ where: { id } });

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
};
