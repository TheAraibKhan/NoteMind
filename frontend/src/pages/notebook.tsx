'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import { AxiosError } from 'axios';
import { useRouter } from 'next/router';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';
import TopicInput from '@/components/TopicInput';
import LoadingState from '@/components/LoadingState';
import GradientButton from '@/components/GradientButton';
import { notesAPI } from '@/utils/api';

interface NoteSection {
  section: string;
  content: string;
  icon: string;
}

interface GeneratedNotesResponse {
  id: string | null;
  topic: string;
  content: {
    definition?: string;
    key_concepts?: string[];
    keyConcepts?: string[];
    important_points?: string[];
    importantPoints?: string[];
    examples?: string[];
    exam_highlights?: string[];
    examHighlights?: string[];
  };
  sections: number;
  saved?: boolean;
  source?: string;
  cached?: boolean;
}

interface ApiErrorResponse {
  error?: string;
  details?: string;
}

const formatList = (items?: string[]) =>
  items && items.length > 0
    ? items.map((item) => `• ${item}`).join('\n')
    : 'No information available.';

const mapApiNotesToSections = (
  content: GeneratedNotesResponse['content'],
): NoteSection[] => [
  {
    section: 'Definition',
    icon: '📖',
    content: content.definition || 'No definition available.',
  },
  {
    section: 'Key Concepts',
    icon: '💡',
    content: formatList(content.key_concepts || content.keyConcepts),
  },
  {
    section: 'Important Points',
    icon: '⭐',
    content: formatList(content.important_points || content.importantPoints),
  },
  {
    section: 'Examples',
    icon: '🔬',
    content: formatList(content.examples),
  },
  {
    section: 'Exam Highlights',
    icon: '🎯',
    content: formatList(content.exam_highlights || content.examHighlights),
  },
];

export default function NotebookPage() {
  const router = useRouter();
  const topicFromQuery =
    typeof router.query.topic === 'string' ? router.query.topic : '';

  const [notes, setNotes] = useState<NoteSection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const handleGenerateNotes = async (inputTopic: string) => {
    setLoading(true);
    setTopic(inputTopic);
    setNotes(null);
    setError(null);
    setSavedToLibrary(false);
    setSource(null);

    try {
      const response = await notesAPI.generate(inputTopic);
      const generated = response.data as GeneratedNotesResponse;
      setNotes(mapApiNotesToSections(generated.content));
      setSavedToLibrary(Boolean(generated.saved));
      setSource(generated.source || null);
      void router.replace(
        `/notebook?topic=${encodeURIComponent(inputTopic)}`,
        undefined,
        { shallow: true },
      );
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      const details = apiError.response?.data?.details;
      const message = apiError.response?.data?.error || apiError.message;
      setError(details || message || 'Failed to generate notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !topicFromQuery || loading || notes || error) {
      return;
    }

    void handleGenerateNotes(topicFromQuery);
  }, [router.isReady, topicFromQuery]);

  return (
    <>
      <Head>
        <title>AI Notes Generator - NoteMind</title>
        <meta
          name="description"
          content="Generate comprehensive, structured study notes from any topic using AI."
        />
      </Head>

      <PageLayout>
        <section className="min-h-screen px-4 pb-16 pt-28">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-purple">
                AI Notes Generator
              </p>
              <h1 className="mb-3 text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                Generate Smart Notes
              </h1>
              <p className="max-w-md text-sm font-inter text-white/40">
                Enter any topic and let AI create comprehensive, structured notes
                for you in seconds.
              </p>
            </motion.div>

            <TopicInput
              onSubmit={handleGenerateNotes}
              onQuizSubmit={(inputTopic) =>
                void router.push(`/quiz?topic=${encodeURIComponent(inputTopic)}`)
              }
              loading={loading}
              placeholder="e.g., Binary Search Trees, REST APIs, Machine Learning..."
            />

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12"
              >
                <LoadingState message={`Generating notes for "${topic}"...`} />
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <GlassCard hover={false} className="border border-red-500/20">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-lg text-red-300">
                      !
                    </div>
                    <div>
                      <h3 className="mb-1 font-inter font-semibold text-white">
                        Couldn&apos;t generate notes
                      </h3>
                      <p className="text-sm leading-relaxed text-white/60">
                        {error}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {notes && !loading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-accent-purple to-accent-pink" />
                    <div>
                      <p className="text-xs font-inter uppercase tracking-wider text-white/30">
                        Generated Notes
                      </p>
                      <h2 className="text-2xl font-playfair font-bold text-white">
                        {topic}
                      </h2>
                    </div>
                  </div>
                  {source && (
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      <div className={`h-2 w-2 rounded-full ${
                        source === 'Wikipedia'
                          ? 'bg-blue-400'
                          : source === 'Groq'
                            ? 'bg-green-400'
                            : source === 'Gemini'
                              ? 'bg-yellow-400'
                              : source === 'OpenAI'
                                ? 'bg-emerald-400'
                                : 'bg-white/40'
                      }`} />
                      <span className="text-xs font-inter font-medium text-white/50">
                        Powered by {source}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  {notes.map((note, i) => (
                    <motion.div
                      key={note.section}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <GlassCard hover={false}>
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-xl">
                            {note.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-3 text-lg font-playfair font-bold text-white">
                              {note.section}
                            </h3>
                            <p className="whitespace-pre-wrap text-sm font-inter leading-relaxed text-white/60">
                              {note.content}
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex flex-wrap justify-center gap-3"
                >
                  <GradientButton
                    size="md"
                    icon="🎯"
                    onClick={() =>
                      void router.push(`/quiz?topic=${encodeURIComponent(topic)}`)
                    }
                  >
                    Generate Quiz
                  </GradientButton>
                  <GradientButton
                    size="md"
                    variant="secondary"
                    icon="🗂"
                    onClick={() =>
                      void router.push(
                        `/flashcards?topic=${encodeURIComponent(topic)}`,
                      )
                    }
                  >
                    Generate Flashcards
                  </GradientButton>
                  <GradientButton
                    size="md"
                    variant="ghost"
                    icon="🔄"
                    onClick={() => void handleGenerateNotes(topic)}
                  >
                    Regenerate Notes
                  </GradientButton>
                </motion.div>
                <p className="mt-4 text-center text-xs font-inter text-white/35">
                  {savedToLibrary
                    ? 'This search is saved automatically to your library and dashboard activity.'
                    : 'You can generate notes without logging in. Sign in to save them to your library and dashboard activity.'}
                </p>
              </motion.div>
            )}

            {!notes && !loading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-16 text-center"
              >
                <GlassCard hover={false} className="relative overflow-hidden p-12">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-purple/20 blur-[80px]" />
                  </div>
                  <div className="relative z-10">
                    <div className="mb-4 text-4xl">📝</div>
                    <p className="mb-1 text-sm font-inter text-white/40">
                      Enter a topic above to generate AI-powered structured notes
                    </p>
                    <p className="text-xs font-inter text-white/25">
                      Works best with specific topics like "Binary Search" or
                      "HTTP Status Codes"
                    </p>
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
