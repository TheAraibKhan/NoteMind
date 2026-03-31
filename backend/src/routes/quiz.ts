import express, { Router } from 'express';
import * as quizController from '@/controllers/quiz';
import { authMiddleware, optionalAuth } from '@/middleware/auth';

const router: Router = express.Router();

router.post('/generate', optionalAuth, quizController.generateQuiz);
router.post('/:quizId/submit', authMiddleware, quizController.submitQuizAnswer);
router.get('/:id', authMiddleware, quizController.getQuiz);

export default router;
