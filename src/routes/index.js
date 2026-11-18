import { Router } from "express";
import routeVideo from "./route_video.js";

const router = Router();

router.use("/videos", routeVideo);

export default router;
