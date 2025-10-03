const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/store.controller");

// public list
router.get("/getstores", ctrl.getStores);

// ratings upsert
router.post("/stores/:storeId/ratings", requireAuth, ctrl.upsertRating);
router.put("/stores/:storeId/ratings", requireAuth, ctrl.upsertRating);

module.exports = router;