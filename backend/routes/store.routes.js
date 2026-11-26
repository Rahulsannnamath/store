const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/store.controller");

// public list
router.get("/getstores", (req, res, next) => req.headers.authorization ? requireAuth(req, res, next) : next(), ctrl.getStores);

// ratings upsert
router.post("/stores/:storeId/ratings", requireAuth, requireRole('user'), ctrl.upsertRating);
router.put("/stores/:storeId/ratings", requireAuth, requireRole('user'), ctrl.upsertRating);

module.exports = router;
