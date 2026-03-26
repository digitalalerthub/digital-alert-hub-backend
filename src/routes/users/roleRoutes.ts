import { Router } from "express";
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoles,
  updateRoleHandler,
} from "../../controllers/users/roleController";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getRoles));
router.post("/", asyncHandler(createRoleHandler));
router.put("/:id", asyncHandler(updateRoleHandler));
router.delete("/:id", asyncHandler(deleteRoleHandler));

export default router;
