const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/owner.controller");

router.get("/stores", requireAuth, requireRole("store_owner"), ctrl.listOwnedStores);
router.get("/stores/:storeId/raters", requireAuth, requireRole("store_owner"), ctrl.getStoreRaters);

module.exports = router;