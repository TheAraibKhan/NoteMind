import { Request, Response } from "express";
import Quiz from "@/models/Quiz";
import Progress from "@/models/Progress";
import { generateQuizQuestions } from "@/services/aiService";
import { logger } from "@/utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface QuizRequest extends Request {
  userId?: string;
  body: {
    topic: string;
    noteId?: string;
    answers?: number[];
  };
}

// ============================================================================
// GENERATE QUIZ
// ============================================================================

export const generateQuiz = async (
  req: QuizRequest,
  res: Response,
): Promise<void> => {
  const requestId = (req as any).id || "unknown";

  try {
    // Topic already validated by middleware
    const topic = req.body.topic?.trim();
    const { noteId } = req.body;
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ success: false, error: "Topic is required" });
      return;
    }

    logger.info("QuizController", "Generating quiz", {
      topic: topic.slice(0, 60),
      authenticated: !!userId,
      requestId,
    });

    const timer = logger.startTimer("QuizController", "generateQuiz");
    const result = await generateQuizQuestions(topic);
    timer.done({ success: result.success, cached: result.cached ?? false });

    if (!result.success || !result.data) {
      const statusCode = result.error?.includes("temporarily") || result.error?.includes("unavailable")
        ? 503
        : 500;
      res.status(statusCode).json({
        success: false,
        error: result.error || "Failed to generate quiz. Please try again.",
        requestId,
      });
      return;
    }

    const questions = result.data;

    // Unauthenticated — return without saving
    if (!userId) {
      res.status(201).json({
        success: true,
        id: null,
        topic,
        questions,
        totalQuestions: questions.length,
        saved: false,
        cached: result.cached || false,
      });
      return;
    }

    // Save for authenticated users
    try {
      const quiz = new Quiz({
        topic,
        userId,
        noteId: noteId || null,
        questions,
      });

      const savedQuiz = await quiz.save();
      logger.info("QuizController", "Quiz saved", {
        quizId: savedQuiz._id,
        questionCount: questions.length,
      });

      res.status(201).json({
        success: true,
        id: savedQuiz._id,
        topic: savedQuiz.topic,
        questions: savedQuiz.questions,
        totalQuestions: savedQuiz.questions.length,
        saved: true,
        cached: result.cached || false,
      });
    } catch (dbError) {
      logger.error("QuizController", "Failed to save quiz to DB", dbError as Error);
      // Return quiz content even if save fails
      res.status(201).json({
        success: true,
        id: null,
        topic,
        questions,
        totalQuestions: questions.length,
        saved: false,
        cached: result.cached || false,
        warning: "Quiz generated but could not be saved.",
      });
    }
  } catch (error) {
    logger.error("QuizController", "Unhandled error in generateQuiz", error as Error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again.",
      requestId,
    });
  }
};

// ============================================================================
// SUBMIT QUIZ ANSWER
// ============================================================================

export const submitQuizAnswer = async (
  req: QuizRequest & { params: { quizId: string } },
  res: Response,
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ success: false, error: "Answers array is required" });
      return;
    }

    const hasInvalidAnswer = answers.some(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 3,
    );
    if (hasInvalidAnswer) {
      res.status(400).json({
        success: false,
        error: "Each answer must be an integer between 0 and 3",
      });
      return;
    }

    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) {
      res.status(404).json({ success: false, error: "Quiz not found" });
      return;
    }

    if (answers.length !== quiz.questions.length) {
      res.status(400).json({
        success: false,
        error: `Expected ${quiz.questions.length} answers, received ${answers.length}`,
      });
      return;
    }

    // Calculate score
    let score = 0;
    const feedback: Array<{
      question: string;
      correct: boolean;
      yourAnswer: number;
      correctAnswer: number;
      explanation: string;
    }> = [];

    quiz.questions.forEach((q, idx) => {
      const isCorrect = answers[idx] === q.correctAnswer;
      if (isCorrect) score++;

      feedback.push({
        question: q.question,
        correct: isCorrect,
        yourAnswer: answers[idx],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      });
    });

    const accuracy = Math.round((score / quiz.questions.length) * 100);

    // Update progress tracking
    try {
      const progress = await Progress.findOne({ userId, topic: quiz.topic });

      if (progress) {
        progress.quizzesTaken += 1;
        progress.attempts.push({
          score,
          totalQuestions: quiz.questions.length,
          date: new Date(),
          accuracy,
        });
        progress.averageAccuracy =
          progress.attempts.reduce((sum, a) => sum + a.accuracy, 0) /
          progress.attempts.length;
        progress.lastAttemptDate = new Date();
        progress.weakTopic = progress.averageAccuracy < 70;
        await progress.save();
      } else {
        const newProgress = new Progress({
          userId,
          topic: quiz.topic,
          quizzesTaken: 1,
          averageAccuracy: accuracy,
          attempts: [
            {
              score,
              totalQuestions: quiz.questions.length,
              date: new Date(),
              accuracy,
            },
          ],
          lastAttemptDate: new Date(),
          weakTopic: accuracy < 70,
        });
        await newProgress.save();
      }
    } catch (progressError) {
      // Progress tracking failure should NOT block the quiz result
      logger.error("QuizController", "Failed to update progress", progressError as Error);
    }

    res.json({
      success: true,
      score,
      totalQuestions: quiz.questions.length,
      accuracy,
      feedback,
    });
  } catch (error) {
    logger.error("QuizController", "Failed to submit quiz", error as Error);
    res.status(500).json({ success: false, error: "Failed to submit quiz" });
  }
};

// ============================================================================
// GET QUIZ BY ID
// ============================================================================

export const getQuiz = async (
  req: QuizRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const quiz = await Quiz.findOne({ _id: id, userId });
    if (!quiz) {
      res.status(404).json({ success: false, error: "Quiz not found" });
      return;
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    logger.error("QuizController", "Failed to fetch quiz", error as Error);
    res.status(500).json({ success: false, error: "Failed to fetch quiz" });
  }
};
