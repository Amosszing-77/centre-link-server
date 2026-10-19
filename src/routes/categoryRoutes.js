const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");

// GET /api/categories/tree — nested tree
router.get("/tree", categoryController.getTree);

// GET /api/categories — flat list
router.get("/", categoryController.getAll);

// POST /api/categories — create
router.post("/", categoryController.create);

// PATCH /api/categories/:id — rename
router.patch("/:id", categoryController.rename);

// DELETE /api/categories/:id — delete (cascades)
router.delete("/:id", categoryController.remove);

module.exports = router;
