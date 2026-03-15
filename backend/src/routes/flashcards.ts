import express, { Router } from 'express';
import * as flashcardController from '@/controllers/flashcards';
import { authMiddleware } from '@/middleware/auth';

const router: Router = express.Router();

router.post('/generate', authMiddleware, flashcardController.generateFlashcards);
router.get('/', authMiddleware, flashcardController.getFlashcards);
router.patch(
  '/:flashcardId/card/:cardIndex',
  authMiddleware,
  flashcardController.updateFlashcardMastery
);

export default router;
