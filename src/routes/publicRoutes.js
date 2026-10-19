const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

router.get("/products", publicController.getPublicProducts);
router.get("/categories/tree", publicController.getPublicCategories);

module.exports = router;
