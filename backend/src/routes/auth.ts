import express, { Router } from 'express';
import * as authController from '@/controllers/auth';
import { authMiddleware } from '@/middleware/auth';

const router: Router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify', authMiddleware, authController.verify);

export default router;
