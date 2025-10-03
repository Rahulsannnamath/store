const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/auth.controller");

router.post("/signup", ctrl.signup);
router.post("/login", ctrl.login);
router.post("/logout", requireAuth, ctrl.logout);
router.get("/me", requireAuth, ctrl.me);

module.exports = router;