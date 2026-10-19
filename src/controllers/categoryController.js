const prisma = require("../config/prisma");

// ---------- Helper: build nested tree from flat list ----------
function buildTree(flatList) {
  const map = {};
  const roots = [];

  // First pass: create map of id -> node with empty children array
  flatList.forEach((node) => {
    map[node.id] = { ...node, children: [] };
  });

  // Second pass: attach each node to its parent (or to roots)
  flatList.forEach((node) => {
    if (node.parentId) {
      if (map[node.parentId]) {
        map[node.parentId].children.push(map[node.id]);
      }
    } else {
      roots.push(map[node.id]);
    }
  });

  return roots;
}

// ---------- GET /api/categories/tree ----------
// Returns full nested tree
async function getTree(req, res, next) {
  try {
    const flat = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const tree = buildTree(flat);
    res.json(tree);
  } catch (err) {
    next(err);
  }
}

// ---------- GET /api/categories ----------
// Returns flat list (useful for dropdowns, filters)
async function getAll(req, res, next) {
  try {
    const flat = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json(flat);
  } catch (err) {
    next(err);
  }
}

// ---------- POST /api/categories ----------
// Body: { name: string, parentId?: string | null }
async function create(req, res, next) {
  try {
    const { name, parentId = null } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    // If parentId provided, verify parent exists
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return res.status(404).json({ error: "Parent category not found" });
      }
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

// ---------- PATCH /api/categories/:id ----------
// Body: { name: string }
async function rename(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ---------- DELETE /api/categories/:id ----------
// Cascades to children via schema onDelete: Cascade
async function remove(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTree,
  getAll,
  create,
  rename,
  remove,
};
