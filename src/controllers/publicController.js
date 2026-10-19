const prisma = require("../config/prisma");

// GET /api/public/products
// Query: ?categoryId=xxx&search=xxx
async function getPublicProducts(req, res, next) {
  try {
    const { categoryId, search, type } = req.query;

    const where = {};
    if (categoryId) {
      const childIds = await getDescendantIds(categoryId);
      where.categoryId = { in: [categoryId, ...childIds] };
    }
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, parentId: true },
        },
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    res.json(products);
  } catch (err) {
    next(err);
  }
}
// Recursively get all descendant category ids
async function getDescendantIds(parentId) {
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });

  if (children.length === 0) return [];

  let ids = children.map((c) => c.id);
  for (const child of children) {
    const deeper = await getDescendantIds(child.id);
    ids = ids.concat(deeper);
  }
  return ids;
}

// GET /api/public/categories/tree
async function getPublicCategories(req, res, next) {
  try {
    const flat = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    // Build nested tree
    const map = {};
    const roots = [];
    flat.forEach((node) => (map[node.id] = { ...node, children: [] }));
    flat.forEach((node) => {
      if (node.parentId && map[node.parentId]) {
        map[node.parentId].children.push(map[node.id]);
      } else {
        roots.push(map[node.id]);
      }
    });

    res.json(roots);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicProducts,
  getPublicCategories,
};
