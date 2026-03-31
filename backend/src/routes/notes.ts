import express, { Router } from "express";
import * as notesController from "@/controllers/notes";
import { authMiddleware, optionalAuth } from "@/middleware/auth";

const router: Router = express.Router();

router.post("/generate", optionalAuth, notesController.generateNotes);
router.get("/", authMiddleware, notesController.getNotes);
router.get("/:id", authMiddleware, notesController.getNoteById);
router.delete("/:id", authMiddleware, notesController.deleteNote);

export default router;
