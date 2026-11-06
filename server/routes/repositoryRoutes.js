
import express from "express";

import {
  validateRepository,
} from "../controllers/repositoryController.js";

import {
  analyzeRepository,
} from "../controllers/analysisController.js";

const router = express.Router();

// Feature 3.1: Repository validation
router.post("/validate", validateRepository);

// Feature 3.2: Repository metadata and file-tree analysis
router.post("/analyze", analyzeRepository);

export default router;
