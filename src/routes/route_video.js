import { Router } from "express";
import videoControlleur from "#controlleur/video_controlleur.js";
import locals from "#middleware/locals.js";

const router = Router();

router.get("/:id", locals, (req, res) => videoControlleur.predictVideo(req, res));
router.post("/training", (req, res) => videoControlleur.trainingAlgo(req, res));
router.post("/pull", (req, res) => videoControlleur.pullNewVideo(req, res));
router.post("/sync", (req, res) => videoControlleur.syncVideo(req, res));

export default router;
