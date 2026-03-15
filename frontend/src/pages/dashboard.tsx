'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';
import DashboardWidget from '@/components/DashboardWidget';
import GradientButton from '@/components/GradientButton';
import { authAPI, flashcardsAPI, notesAPI, progressAPI } from '@/utils/api';

interface UserProfile {
  userId: string;
  email: string;
  name: string;
}

interface NoteRecord {
  _id: string;
  topic: string;
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

const tooltipStyle = {
  backgroundColor: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#f5f5f5',
};

const timeAgo = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) {
    return `${Math.max(hours, 1)}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function DashboardPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRecord[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [stats, setStats] = useState<ProgressResponse['stats'] | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [userResponse, notesResponse, flashcardsResponse, progressResponse, streakResponse] =
          await Promise.all([
            authAPI.verify(),
            notesAPI.getAll(),
            flashcardsAPI.getAll(),
            progressAPI.getAll(),
            progressAPI.getStreak(),
          ]);

        setUser(userResponse.data as UserProfile);
        setNotes(notesResponse.data as NoteRecord[]);
        setFlashcards(flashcardsResponse.data as FlashcardRecord[]);
        const progressPayload = progressResponse.data as ProgressResponse;
        setProgress(progressPayload.progress);
        setStats(progressPayload.stats);
        setStreak(Number(streakResponse.data?.streak || 0));
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const accuracyData = progress.map((item) => ({
    topic: item.topic.length > 14 ? `${item.topic.slice(0, 14)}…` : item.topic,
    accuracy: Math.round(item.averageAccuracy),
  }));

  const recentActivity = [
    ...notes.map((note) => ({
      action: 'Generated notes',
      topic: note.topic,
      time: timeAgo(note.createdAt),
      createdAt: note.createdAt,
      icon: '📝',
    })),
    ...flashcards.map((item) => ({
      action: 'Built flashcards',
      topic: item.topic,
      time: timeAgo(item.createdAt),
      createdAt: item.createdAt,
      icon: '🗂',
    })),
    ...progress.map((item) => ({
      action: 'Completed quiz',
      topic: item.topic,
      time: timeAgo(item.updatedAt),
      createdAt: item.updatedAt,
      icon: '🎯',
    })),
  ]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  const studyTimeData = [
    { name: 'Notes', value: notes.length, color: '#a855f7' },
    {
      name: 'Quizzes',
      value: progress.reduce((sum, item) => sum + item.quizzesTaken, 0),
      color: '#ec4899',
    },
    { name: 'Flashcards', value: flashcards.length, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const weakTopics = progress
    .filter((item) => item.weakTopic)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
    .slice(0, 3);

  const masteredFlashcards = flashcards.reduce(
    (sum, item) => sum + item.cards.filter((card) => card.mastered).length,
    0,
  );
  const totalFlashcards = flashcards.reduce((sum, item) => sum + item.cards.length, 0);

  return (
    <>
      <Head>
        <title>Learning Dashboard - NoteMind</title>
        <meta
          name="description"
          content="Track your learning progress, saved searches, quiz accuracy, and flashcard mastery."
        />
      </Head>

      <PageLayout>
        <section className="min-h-screen px-4 pb-16 pt-28">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            >
              <div>
                <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-purple">
                  Dashboard
                </p>
                <h1 className="mb-3 text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                  Learning Activity
                </h1>
                <p className="text-sm font-inter text-white/40">
                  Your searches, notes, quizzes, and flashcards all feed into
                  this overview.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/notebook">
                  <GradientButton variant="outline" size="sm" icon="📝">
                    New Notes
                  </GradientButton>
                </Link>
                <Link href="/library">
                  <GradientButton variant="outline" size="sm" icon="📚">
                    Open Library
                  </GradientButton>
                </Link>
              </div>
            </motion.div>

            {loading ? (
              <GlassCard hover={false} className="p-12 text-center">
                <p className="text-sm text-white/50">Loading dashboard activity...</p>
              </GlassCard>
            ) : (
              <>
                <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr,1fr]">
                  <GlassCard hover={false} className="p-6">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-white/30">
                          Profile Overview
                        </p>
                        <h2 className="mt-2 text-2xl font-playfair font-bold text-white">
                          {user?.name || 'Learner'}
                        </h2>
                        <p className="mt-1 text-sm text-white/45">
                          {user?.email || 'Signed in user'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="text-[10px] uppercase tracking-wider text-white/25">
                            Topics Saved
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-white/80">
                            {stats?.totalTopics || notes.length}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                          <p className="text-[10px] uppercase tracking-wider text-white/25">
                            Streak
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-white/80">
                            {streak}d
                          </p>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard hover={false} className="p-6">
                    <p className="mb-4 text-xs uppercase tracking-wider text-white/30">
                      Quick Services
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { href: '/notebook', label: 'Notes', icon: '📝' },
                        { href: '/quiz', label: 'Quiz', icon: '🎯' },
                        { href: '/flashcards', label: 'Flashcards', icon: '🗂' },
                        { href: '/library', label: 'Library', icon: '📚' },
                      ].map((service) => (
                        <Link href={service.href} key={service.href}>
                          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
                            <p className="text-xl">{service.icon}</p>
                            <p className="mt-2 text-sm font-medium text-white/75">
                              {service.label}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </GlassCard>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <DashboardWidget title="Topics Studied" value={stats?.totalTopics || notes.length} icon="📚" />
                  <DashboardWidget
                    title="Avg Accuracy"
                    value={`${Math.round(Number(stats?.averageAccuracy || 0))}%`}
                    icon="🎯"
                  />
                  <DashboardWidget title="Study Streak" value={`${streak} days`} icon="🔥" />
                  <DashboardWidget
                    title="Flashcards Mastered"
                    value={`${masteredFlashcards}/${totalFlashcards || 0}`}
                    icon="✅"
                  />
                </div>

                <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <GlassCard hover={false} className="p-6">
                    <h3 className="mb-6 text-sm font-inter font-semibold uppercase tracking-wider text-white/70">
                      Quiz Accuracy by Topic
                    </h3>
                    {accuracyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={accuracyData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="topic" stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.25)" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                          <Bar dataKey="accuracy" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="100%" stopColor="#7c3aed" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-white/40">
                        Complete a quiz to see performance by topic.
                      </p>
                    )}
                  </GlassCard>

                  <GlassCard hover={false} className="p-6">
                    <h3 className="mb-6 text-sm font-inter font-semibold uppercase tracking-wider text-white/70">
                      Study Distribution
                    </h3>
                    {studyTimeData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={studyTimeData}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={82}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {studyTimeData.map((entry, index) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                          {studyTimeData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2 text-xs">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-white/60">{item.name}</span>
                              <span className="ml-auto text-white/40">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-white/40">
                        Your activity breakdown will appear after you start saving study sessions.
                      </p>
                    )}
                  </GlassCard>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <GlassCard hover={false} className="p-6">
                    <h3 className="mb-4 text-sm font-inter font-semibold uppercase tracking-wider text-white/70">
                      Recent Activity
                    </h3>
                    {recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                          <div
                            key={`${activity.action}-${activity.topic}-${index}`}
                            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.02]"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-sm">
                              {activity.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-white/70">
                                {activity.action}:{' '}
                                <span className="text-white/90">{activity.topic}</span>
                              </p>
                            </div>
                            <span className="text-xs text-white/25">{activity.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">
                        Start with a search in notes and your activity feed will populate here.
                      </p>
                    )}
                  </GlassCard>

                  <GlassCard hover={false} className="p-6">
                    <h3 className="mb-4 text-sm font-inter font-semibold uppercase tracking-wider text-white/70">
                      Recommended Review Topics
                    </h3>
                    {weakTopics.length > 0 ? (
                      <div className="space-y-3">
                        {weakTopics.map((item) => (
                          <div
                            key={item._id}
                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white/80">{item.topic}</p>
                                <p className="mt-1 text-xs text-white/35">
                                  Accuracy {Math.round(item.averageAccuracy)}% · {item.quizzesTaken} quizzes
                                </p>
                              </div>
                              <GradientButton
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  window.location.assign(
                                    `/quiz?topic=${encodeURIComponent(item.topic)}`,
                                  )
                                }
                              >
                                Review
                              </GradientButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">
                        No weak topics flagged yet. Keep taking quizzes to build targeted review suggestions.
                      </p>
                    )}
                  </GlassCard>
                </div>
              </>
            )}
          </div>
        </section>
      </PageLayout>
    </>
  );
}
