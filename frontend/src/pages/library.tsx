"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import { useRouter } from "next/router";
import PageLayout from "@/components/PageLayout";
import GlassCard from "@/components/GlassCard";
import GradientButton from "@/components/GradientButton";
import { flashcardsAPI, notesAPI, progressAPI } from "@/utils/api";

interface NoteRecord {
  _id: string;
  topic: string;
  sections: number;
  content: {
    definition?: string;
  };
  createdAt: string;
}

interface FlashcardRecord {
  _id: string;
  topic: string;
  cards: Array<{ mastered?: boolean }>;
  createdAt: string;
}

interface ProgressRecord {
  _id: string;
  topic: string;
  quizzesTaken: number;
  averageAccuracy: number;
  weakTopic: boolean;
  updatedAt: string;
}

interface ProgressResponse {
  stats: {
    totalTopics: number;
    averageAccuracy: string | number;
    totalQuizzes: number;
    weakTopics: string[];
  };
  progress: ProgressRecord[];
}

interface LibraryEntry {
  id: string;
  topic: string;
  summary: string;
  createdAt: string;
  sections: number;
  flashcardCount: number;
  masteredCount: number;
  quizzesTaken: number;
  averageAccuracy: number | null;
  status: "strong" | "weak" | "new";
}

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function LibraryPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "strong" | "weak" | "new"
  >("all");
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      setError(null);

      try {
        const [notesResponse, flashcardsResponse, progressResponse] =
          await Promise.all([
            notesAPI.getAll(),
            flashcardsAPI.getAll(),
            progressAPI.getAll(),
          ]);

        const notes = (notesResponse.data as any).data as NoteRecord[];
        const flashcards = (flashcardsResponse.data as any)
          .data as FlashcardRecord[];
        const progress = (progressResponse.data as ProgressResponse).progress;

        const builtEntries = notes.map((note) => {
          const noteProgress = progress.find(
            (item) => item.topic === note.topic,
          );
          const noteFlashcards = flashcards.find(
            (item) => item.topic === note.topic,
          );
          const averageAccuracy =
            noteProgress && Number.isFinite(noteProgress.averageAccuracy)
              ? Math.round(noteProgress.averageAccuracy)
              : null;

          return {
            id: note._id,
            topic: note.topic,
            summary:
              note.content.definition ||
              "Structured notes saved from your recent search.",
            createdAt: note.createdAt,
            sections: note.sections,
            flashcardCount: noteFlashcards?.cards.length || 0,
            masteredCount:
              noteFlashcards?.cards.filter((card) => card.mastered).length || 0,
            quizzesTaken: noteProgress?.quizzesTaken || 0,
            averageAccuracy,
            status:
              averageAccuracy === null
                ? "new"
                : averageAccuracy >= 80
                  ? "strong"
                  : "weak",
          } satisfies LibraryEntry;
        });

        setEntries(
          builtEntries.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } catch (err) {
        setError("Could not load your library right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadLibrary();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.topic
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" || entry.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <Head>
        <title>Library - NoteMind</title>
        <meta
          name="description"
          content="Browse your saved searches, notes, quiz progress, and flashcard decks."
        />
      </Head>

      <PageLayout>
        <section className="min-h-screen px-4 pb-16 pt-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-gold">
                    Library
                  </p>
                  <h1 className="mb-3 text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                    Study Archive
                  </h1>
                  <p className="text-sm font-inter text-white/40">
                    Every search-based note, quiz path, and flashcard deck you
                    generated appears here.
                  </p>
                </div>
                <div className="text-sm font-inter text-white/35">
                  <span className="font-semibold text-white/70">
                    {filteredEntries.length}
                  </span>{" "}
                  study entries
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8 space-y-4"
            >
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/30">
                  🔍
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your topics..."
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-10 pr-4 text-sm font-inter text-white/80 placeholder:text-white/25 focus:border-accent-purple/40 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All Entries" },
                  { key: "new", label: "New" },
                  { key: "strong", label: "Strong" },
                  { key: "weak", label: "Needs Review" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() =>
                      setSelectedFilter(
                        filter.key as "all" | "strong" | "weak" | "new",
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-xs font-inter font-medium transition-all ${
                      selectedFilter === filter.key
                        ? "border border-accent-purple/40 bg-accent-purple/20 text-accent-purple"
                        : "border border-white/[0.06] bg-white/[0.03] text-white/40 hover:border-white/[0.12] hover:text-white/60"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {loading && (
              <GlassCard hover={false} className="p-12 text-center">
                <p className="text-sm text-white/50">Loading your library...</p>
              </GlassCard>
            )}

            {error && !loading && (
              <GlassCard hover={false} className="border border-red-500/20 p-8">
                <p className="text-sm text-white/60">{error}</p>
              </GlassCard>
            )}

            {!loading && !error && filteredEntries.length > 0 && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard
                      className="flex h-full flex-col justify-between"
                      glow
                    >
                      <div>
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-inter font-medium uppercase tracking-wider ${
                              entry.status === "strong"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : entry.status === "weak"
                                  ? "bg-pink-500/15 text-pink-300"
                                  : "bg-white/[0.05] text-white/45"
                            }`}
                          >
                            {entry.status === "strong"
                              ? "Strong"
                              : entry.status === "weak"
                                ? "Needs Review"
                                : "New"}
                          </span>
                          <span className="text-[11px] font-inter text-white/25">
                            {formatRelativeDate(entry.createdAt)}
                          </span>
                        </div>

                        <h3 className="mb-2 text-lg font-playfair font-bold text-white">
                          {entry.topic}
                        </h3>
                        <p className="mb-5 text-sm font-inter leading-relaxed text-white/45">
                          {entry.summary}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-white/25">
                              Notes
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white/80">
                              {entry.sections} sections
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-white/25">
                              Quizzes
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white/80">
                              {entry.quizzesTaken}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-white/25">
                              Accuracy
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white/80">
                              {entry.averageAccuracy !== null
                                ? `${entry.averageAccuracy}%`
                                : "Pending"}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-white/25">
                              Flashcards
                            </p>
                            <p className="mt-1 text-lg font-semibold text-white/80">
                              {entry.masteredCount}/{entry.flashcardCount}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-2">
                        <GradientButton
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            void router.push(
                              `/notebook?topic=${encodeURIComponent(entry.topic)}`,
                            )
                          }
                        >
                          Notes
                        </GradientButton>
                        <GradientButton
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            void router.push(
                              `/quiz?topic=${encodeURIComponent(entry.topic)}`,
                            )
                          }
                        >
                          Quiz
                        </GradientButton>
                        <GradientButton
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            void router.push(
                              `/flashcards?topic=${encodeURIComponent(entry.topic)}`,
                            )
                          }
                        >
                          Cards
                        </GradientButton>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && !error && filteredEntries.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GlassCard
                  hover={false}
                  className="mx-auto max-w-md p-12 text-center"
                >
                  <div className="mb-4 text-4xl">📚</div>
                  <p className="mb-2 text-sm font-inter text-white/40">
                    No saved study entries yet.
                  </p>
                  <p className="mb-6 text-xs font-inter text-white/25">
                    Generate notes, quizzes, or flashcards from a topic and
                    they&apos;ll show up here automatically.
                  </p>
                  <GradientButton
                    size="md"
                    icon="✨"
                    onClick={() => void router.push("/notebook")}
                  >
                    Start Studying
                  </GradientButton>
                </GlassCard>
              </motion.div>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  );
}
