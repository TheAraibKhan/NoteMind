'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import PageLayout from '@/components/PageLayout';
import Flashcard from '@/components/Flashcard';
import GlassCard from '@/components/GlassCard';
import GradientButton from '@/components/GradientButton';
import TopicInput from '@/components/TopicInput';
import LoadingState from '@/components/LoadingState';
import { flashcardsAPI } from '@/utils/api';

interface FlashcardItem {
  front: string;
  back: string;
  mastered?: boolean;
}

interface GeneratedFlashcardsResponse {
  id: string | null;
  topic: string;
  cards: FlashcardItem[];
  totalCards: number;
  saved?: boolean;
  source?: string;
}

interface ApiErrorResponse {
  error?: string;
  details?: string;
}

export default function FlashcardsPage() {
  const router = useRouter();
  const topicFromQuery =
    typeof router.query.topic === 'string' ? router.query.topic : '';

  const [flashcardSetId, setFlashcardSetId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const generateFlashcards = async (inputTopic: string) => {
    setLoading(true);
    setError(null);
    setTopic(inputTopic);
    setCurrentCard(0);
    setSavedToLibrary(false);
    setSource(null);

    try {
      const response = await flashcardsAPI.generate(inputTopic);
      const generated = response.data as GeneratedFlashcardsResponse;
      setFlashcardSetId(generated.id);
      setCards(generated.cards || []);
      setSavedToLibrary(Boolean(generated.saved));
      setSource(generated.source || null);
      void router.replace(
        `/flashcards?topic=${encodeURIComponent(inputTopic)}`,
        undefined,
        { shallow: true },
      );
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(
        apiError.response?.data?.details ||
          apiError.response?.data?.error ||
          apiError.message ||
          'Failed to generate flashcards.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !topicFromQuery || loading || cards.length > 0 || error) {
      return;
    }

    void generateFlashcards(topicFromQuery);
  }, [router.isReady, topicFromQuery]);

  const masteredCount = cards.filter((card) => card.mastered).length;
  const allDone = cards.length > 0 && masteredCount === cards.length;
  const activeCard = cards[currentCard];
  const isCurrentMastered = Boolean(activeCard?.mastered);
  const progress = cards.length > 0 ? ((currentCard + 1) / cards.length) * 100 : 0;

  const updateMastery = async (mastered: boolean) => {
    if (!flashcardSetId) {
      return;
    }

    setCards((current) =>
      current.map((card, index) =>
        index === currentCard ? { ...card, mastered } : card,
      ),
    );

    try {
      await flashcardsAPI.updateMastery(flashcardSetId, currentCard, mastered);
    } catch (err) {
      setCards((current) =>
        current.map((card, index) =>
          index === currentCard ? { ...card, mastered: !mastered } : card,
        ),
      );
    }
  };

  const handleMastered = async () => {
    if (!isCurrentMastered) {
      await updateMastery(true);
    }

    if (currentCard < cards.length - 1) {
      setCurrentCard((current) => current + 1);
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard((current) => current - 1);
    }
  };

  const handleNext = () => {
    if (currentCard < cards.length - 1) {
      setCurrentCard((current) => current + 1);
    }
  };

  const handleReset = () => {
    setCurrentCard(0);
    setCards((current) => current.map((card) => ({ ...card, mastered: false })));
  };

  return (
    <>
      <Head>
        <title>Flashcards - NoteMind</title>
        <meta
          name="description"
          content="Master concepts through interactive, adaptive flashcard sessions."
        />
      </Head>

      <PageLayout>
        <section className="min-h-screen px-4 pb-16 pt-28">
          <div className="mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-gold">
                Flashcards
              </p>
              <h1 className="mb-3 text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                Master Concepts
              </h1>
              <p className="text-sm font-inter text-white/40">
                Build a quick revision deck from the topic you searched.
              </p>
            </motion.div>

            <TopicInput
              onSubmit={generateFlashcards}
              onQuizSubmit={(inputTopic) =>
                void router.push(`/quiz?topic=${encodeURIComponent(inputTopic)}`)
              }
              loading={loading}
              placeholder="e.g., Binary Trees, SQL Indexes, REST APIs..."
            />

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12"
              >
                <LoadingState message={`Building flashcards for "${topic || topicFromQuery}"...`} />
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <GlassCard hover={false} className="border border-red-500/20">
                  <p className="text-sm leading-relaxed text-white/60">{error}</p>
                </GlassCard>
              </motion.div>
            )}

            {!loading && cards.length > 0 && !error && !allDone && activeCard && (
              <>
                <div className="mb-8 mt-10">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inter text-white/40">Deck</span>
                      <span className="text-sm font-inter font-semibold text-white">
                        {topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inter text-white/30">Mastered:</span>
                      <span className="text-sm font-inter font-semibold text-accent-green">
                        {masteredCount}/{cards.length}
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
                      className="h-full rounded-full bg-gradient-to-r from-accent-gold to-accent-pink"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                  <div className="mt-3 flex justify-center gap-2">
                    {cards.map((card, index) => (
                      <button
                        key={`${card.front}-${index}`}
                        onClick={() => setCurrentCard(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          card.mastered
                            ? 'w-6 bg-accent-green'
                            : index === currentCard
                              ? 'w-6 bg-accent-gold'
                              : 'w-2 bg-white/[0.1]'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentCard}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Flashcard front={activeCard.front} back={activeCard.back} />
                  </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <GradientButton
                    onClick={handlePrevious}
                    disabled={currentCard === 0}
                    variant="ghost"
                    size="md"
                  >
                    ← Previous
                  </GradientButton>

                  <GradientButton
                    onClick={() => void handleMastered()}
                    variant={isCurrentMastered ? 'secondary' : 'primary'}
                    size="md"
                    icon={isCurrentMastered ? '✓' : '✨'}
                  >
                    {isCurrentMastered ? 'Mastered' : 'Mark as Mastered'}
                  </GradientButton>

                  <GradientButton
                    onClick={handleNext}
                    disabled={currentCard === cards.length - 1}
                    variant="ghost"
                    size="md"
                  >
                    Next →
                  </GradientButton>
                </div>
              </>
            )}

            {!loading && allDone && cards.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-10"
              >
                <GlassCard hover={false} className="relative overflow-hidden p-12 text-center">
                  <div className="relative z-10">
                    <div className="mb-4 text-5xl">🎉</div>
                    <h2 className="mb-3 text-3xl font-playfair font-bold gradient-text">
                      Flashcard Session Complete
                    </h2>
                    <p className="mb-2 text-sm font-inter text-white/50">
                      You reviewed <span className="font-semibold text-accent-gold">{cards.length}</span>{' '}
                      cards for <span className="font-semibold text-white">{topic}</span>.
                    </p>
                    <p className="mb-8 text-xs font-inter text-white/30">
                      {savedToLibrary
                        ? 'This session is now reflected in your library and activity history.'
                        : 'You can review flashcards without logging in. Sign in to save decks and mastery history.'}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <GradientButton onClick={handleReset} size="lg" icon="🔄">
                        Study Again
                      </GradientButton>
                      <GradientButton
                        variant="secondary"
                        size="lg"
                        icon="📚"
                        onClick={() => void router.push('/library')}
                      >
                        Open Library
                      </GradientButton>
                      <GradientButton
                        variant="ghost"
                        size="lg"
                        icon="📝"
                        onClick={() =>
                          void router.push(`/notebook?topic=${encodeURIComponent(topic)}`)
                        }
                      >
                        Back to Notes
                      </GradientButton>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  );
}
