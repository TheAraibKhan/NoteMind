import { Request, Response } from "express";
import Quiz from "@/models/Quiz";
import Progress from "@/models/Progress";
import { generateQuizQuestions } from "@/services/aiService";

interface QuizRequest extends Request {
  userId?: string;
  body: {
    topic: string;
    noteId?: string;
    answers?: number[];
  };
}

export const generateQuiz = async (
  req: QuizRequest,
  res: Response,
): Promise<void> => {
  try {
    const topic = req.body.topic?.trim();
    const { noteId } = req.body;
    const userId = req.userId;

    if (!topic) {
      res.status(400).json({ error: "Topic is required" });
      return;
    }

    // Generate quiz questions using AI
    const questions = await generateQuizQuestions(topic);

    if (!userId) {
      res.status(201).json({
        id: null,
        topic,
        questions,
        totalQuestions: questions.length,
        saved: false,
      });
      return;
    }

    // Save quiz for authenticated users
    const quiz = new Quiz({
      topic,
      userId,
      noteId: noteId || null,
      questions,
    });

    await quiz.save();

    res.status(201).json({
      id: quiz._id,
      topic: quiz.topic,
      questions: quiz.questions,
      totalQuestions: quiz.questions.length,
      saved: true,
    });
  } catch (error) {
    console.error("Failed to generate quiz:", error);
    res.status(500).json({
      error: "Failed to generate quiz",
      details:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : undefined,
    });
  }
};

export const submitQuizAnswer = async (
  req: QuizRequest & { params: { quizId: string } },
  res: Response,
): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ error: "Answers array required" });
      return;
    }

    const hasInvalidAnswer = answers.some(
      (answer) => !Number.isInteger(answer) || answer < 0 || answer > 3,
    );

    if (hasInvalidAnswer) {
      res.status(400).json({ error: "Answers must be integers between 0 and 3" });
      return;
    }

    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    if (answers.length !== quiz.questions.length) {
      res.status(400).json({ error: "Answers must match the quiz length" });
      return;
    }

    // Calculate score
    let score = 0;
    quiz.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        score++;
      }
    });

    const accuracy = Math.round((score / quiz.questions.length) * 100);

    // Update progress
    const progress = await Progress.findOne({
      userId,
      topic: quiz.topic,
    });

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

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      accuracy,
    });
  } catch (error) {
    console.error("Failed to submit quiz:", error);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
};

export const getQuiz = async (
  req: QuizRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const quiz = await Quiz.findOne({ _id: id, userId });

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
};
