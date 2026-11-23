import { Router } from "express";
import videoControlleur from "#controlleur/video_controlleur.js";
import userId from "#middleware/user_id.js";
import locals from "#middleware/locals.js";

const router = Router();

router.get("/:id", locals, (req, res) => videoControlleur.predictVideo(req, res));
router.post("/training", (req, res) => videoControlleur.trainingAlgo(req, res));

export default router;
