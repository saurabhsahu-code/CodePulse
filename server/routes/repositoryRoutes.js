import express from "express";
import { validateRepository } from "../controllers/repositoryController.js";

const router = express.Router();

router.post("/validate", validateRepository);

export default router;