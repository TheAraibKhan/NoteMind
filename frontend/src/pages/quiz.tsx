'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';
import QuizCard from '@/components/QuizCard';
import GradientButton from '@/components/GradientButton';
import TopicInput from '@/components/TopicInput';
import LoadingState from '@/components/LoadingState';
import { quizAPI } from '@/utils/api';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface GeneratedQuizResponse {
  id: string;
  topic: string;
  questions: Question[];
  totalQuestions: number;
  source?: string;
}

interface ApiErrorResponse {
  error?: string;
  details?: string;
}

export default function QuizPage() {
  const router = useRouter();
  const topicFromQuery =
    typeof router.query.topic === 'string' ? router.query.topic : '';

  const [quizTopic, setQuizTopic] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const startQuiz = async (topic: string) => {
    setLoading(true);
    setError(null);
    setQuizCompleted(false);
    setQuizStarted(false);
    setSelectedOption(null);
    setSubmitted(false);
    setCurrentQuestion(0);
    setScore(0);
    setQuizTopic(topic);
    setSource(null);

    try {
      const response = await quizAPI.generate(topic);
      const generated = response.data as GeneratedQuizResponse;
      setQuestions(generated.questions || []);
      setQuizStarted(true);
      setSource(generated.source || null);
      if (router.pathname === '/quiz') {
        void router.replace(
          `/quiz?topic=${encodeURIComponent(topic)}`,
          undefined,
          { shallow: true },
        );
      }
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      const details = apiError.response?.data?.details;
      const message = apiError.response?.data?.error || apiError.message;
      setError(details || message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !topicFromQuery || loading || quizStarted || questions.length > 0) {
      return;
    }

    void startQuiz(topicFromQuery);
  }, [router.isReady, topicFromQuery, loading, quizStarted, questions.length]);

  const question = questions[currentQuestion];
  const progress =
    questions.length > 0
      ? ((currentQuestion + 1) / questions.length) * 100
      : 0;

  const handleSelect = (optionIdx: number) => {
    if (!submitted) {
      setSelectedOption(optionIdx);
    }
  };

  const handleSubmit = () => {
    if (!question) {
      return;
    }

    setSubmitted(true);
    if (selectedOption === question.correctAnswer) {
      setScore((current) => current + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((current) => current + 1);
      setSelectedOption(null);
      setSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRestart = () => {
    if (quizTopic) {
      void startQuiz(quizTopic);
    } else {
      setQuestions([]);
      setCurrentQuestion(0);
      setSelectedOption(null);
      setSubmitted(false);
      setScore(0);
      setQuizStarted(false);
      setQuizCompleted(false);
      setError(null);
    }
  };

  const accuracy =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <>
      <Head>
        <title>Quiz Mode - NoteMind</title>
        <meta
          name="description"
          content="Test your understanding with AI-generated adaptive quizzes."
        />
      </Head>

      <PageLayout>
        <section className="min-h-screen px-4 pb-16 pt-28">
          <div className="mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              {!quizStarted && !loading ? (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center"
                >
                  <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-pink">
                    Quiz Mode
                  </p>
                  <h1 className="mb-3 text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                    Test Your Knowledge
                  </h1>
                  <p className="mb-10 text-sm font-inter text-white/40">
                    Enter a topic and generate a quiz instantly.
                  </p>

                  <TopicInput
                    onSubmit={startQuiz}
                    onQuizSubmit={startQuiz}
                    loading={loading}
                    placeholder="e.g., Binary Trees, HTTP, Operating Systems..."
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8"
                    >
                      <GlassCard hover={false} className="border border-red-500/20">
                        <p className="text-sm text-white/60">{error}</p>
                      </GlassCard>
                    </motion.div>
                  )}
                </motion.div>
              ) : loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <LoadingState message={`Generating quiz for "${quizTopic || topicFromQuery}"...`} />
                </motion.div>
              ) : quizCompleted ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <GlassCard hover={false} className="mx-auto max-w-md overflow-hidden p-12">
                    <div className="relative z-10">
                      <div className="relative mx-auto mb-6 h-32 w-32">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="6"
                          />
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="none"
                            stroke="url(#scoreGradient)"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${(accuracy / 100) * 264} 264`}
                            initial={{ strokeDasharray: '0 264' }}
                            animate={{ strokeDasharray: `${(accuracy / 100) * 264} 264` }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                          />
                          <defs>
                            <linearGradient id="scoreGradient">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-bold font-inter text-white">
                            {accuracy}%
                          </span>
                        </div>
                      </div>

                      <h2 className="mb-2 text-2xl font-playfair font-bold">
                        {accuracy >= 80
                          ? 'Excellent!'
                          : accuracy >= 50
                            ? 'Good Job!'
                            : 'Keep Practicing!'}
                      </h2>
                      <p className="mb-2 text-sm font-inter text-white/50">
                        You scored <span className="font-semibold text-white">{score}</span> out of{' '}
                        <span className="font-semibold text-white">{questions.length}</span>
                      </p>
                      <p className="mb-8 text-xs font-inter text-white/30">
                        Topic: {quizTopic}
                      </p>

                      <div className="flex flex-wrap justify-center gap-3">
                        <GradientButton onClick={handleRestart} size="md" icon="🔄">
                          Try Again
                        </GradientButton>
                        <GradientButton
                          variant="secondary"
                          size="md"
                          icon="📝"
                          onClick={() =>
                            void router.push(`/notebook?topic=${encodeURIComponent(quizTopic)}`)
                          }
                        >
                          Back to Notes
                        </GradientButton>
                        <GradientButton
                          variant="secondary"
                          size="md"
                          icon="🗂"
                          onClick={() =>
                            void router.push(
                              `/flashcards?topic=${encodeURIComponent(quizTopic)}`,
                            )
                          }
                        >
                          Open Flashcards
                        </GradientButton>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : question ? (
                <motion.div
                  key="quiz"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-8">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-inter text-white/40">Question</span>
                        <span className="text-sm font-inter font-semibold text-white">
                          {currentQuestion + 1}
                        </span>
                        <span className="text-xs font-inter text-white/30">
                          of {questions.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-inter text-white/30">Topic:</span>
                        <span className="text-sm font-inter font-semibold text-accent-gold">
                          {quizTopic}
                        </span>
                        {source && (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              source === 'Wikipedia' ? 'bg-blue-400'
                                : source === 'Groq' ? 'bg-green-400'
                                : source === 'Gemini' ? 'bg-yellow-400'
                                : source === 'OpenAI' ? 'bg-emerald-400'
                                : 'bg-white/40'
                            }`} />
                            <span className="text-[10px] font-inter text-white/30">{source}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-pink"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <QuizCard
                        question={question.question}
                        options={question.options}
                        selectedOption={selectedOption}
                        onSelect={handleSelect}
                        submitted={submitted}
                        correctAnswer={question.correctAnswer}
                      />
                    </motion.div>
                  </AnimatePresence>

                  <motion.div className="mt-8 flex flex-wrap justify-center gap-3" layout>
                    {!submitted ? (
                      <GradientButton
                        onClick={handleSubmit}
                        disabled={selectedOption === null}
                        size="lg"
                      >
                        Submit Answer
                      </GradientButton>
                    ) : (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full"
                        >
                          <GlassCard hover={false} className="mb-4">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">💡</span>
                              <div>
                                <p className="mb-1 text-xs font-inter font-medium text-accent-purple">
                                  Explanation
                                </p>
                                <p className="text-sm font-inter text-white/60">
                                  {question.explanation}
                                </p>
                              </div>
                            </div>
                          </GlassCard>
                        </motion.div>
                        <GradientButton
                          onClick={handleNext}
                          size="lg"
                          icon={currentQuestion === questions.length - 1 ? '🏁' : '→'}
                        >
                          {currentQuestion === questions.length - 1
                            ? 'Finish Quiz'
                            : 'Next Question'}
                        </GradientButton>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
