import { Router } from "express";
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoles,
  updateRoleHandler,
} from "../../controllers/users/roleController";
import { verifyToken } from "../../middleware/authMiddleware";
import { isAdmin } from "../../middleware/roleMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", verifyToken, isAdmin, asyncHandler(getRoles));
router.post("/", verifyToken, isAdmin, asyncHandler(createRoleHandler));
router.put("/:id", verifyToken, isAdmin, asyncHandler(updateRoleHandler));
router.delete("/:id", verifyToken, isAdmin, asyncHandler(deleteRoleHandler));

export default router;
