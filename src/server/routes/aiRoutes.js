import express from 'express';
import {
  generateRubrics,
  chatWithAI,
  generateQuestions,
  analyzeJobDescription,
} from '../controllers/aiController.js';

const router = express.Router();

// AI-powered routes
router.post('/generate-rubrics', generateRubrics);
router.post('/chat', chatWithAI);
router.post('/generate-questions', generateQuestions);
router.post('/analyze-job-description', analyzeJobDescription);

export default router;
