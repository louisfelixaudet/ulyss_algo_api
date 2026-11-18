import { Router } from "express";
import { videoControlleur } from "#controlleur/video_controlleur.js";

const router = Router();

router.get("/:id", videoControlleur.predictVideo());
router.post("/training", videoControlleur.trainingAlgo());

export default router;
