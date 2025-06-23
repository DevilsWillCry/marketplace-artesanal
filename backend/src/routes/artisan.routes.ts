import { Router } from "express";
import { getArtisanOrders } from "../controllers/artisan.controller";
import { authMiddleware } from "../middleware/auth.middleware"; 


const router = Router();

router.get("/orders", [authMiddleware], getArtisanOrders);

export default router;