const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/admin.controller");

router.get("/stats", requireAuth, requireRole("admin"), ctrl.stats);

router.get("/users", requireAuth, requireRole("admin"), ctrl.listUsers);
router.get("/users/:id", requireAuth, requireRole("admin"), ctrl.getUser);
router.post("/users", requireAuth, requireRole("admin"), ctrl.createUser);

router.get("/stores", requireAuth, requireRole("admin"), ctrl.listStores);
router.post("/stores", requireAuth, requireRole("admin"), ctrl.createStore);

module.exports = router;