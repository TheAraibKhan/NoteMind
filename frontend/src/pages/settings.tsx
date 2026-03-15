'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import PageLayout from '@/components/PageLayout';
import GlassCard from '@/components/GlassCard';
import GradientButton from '@/components/GradientButton';
import { authAPI, flashcardsAPI, notesAPI, progressAPI } from '@/utils/api';

const settingsSections = [
  { id: 'profile', label: 'Profile Overview', icon: '👤' },
  { id: 'learning', label: 'Learning Setup', icon: '📚' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'privacy', label: 'Privacy', icon: '🔒' },
  { id: 'workspace', label: 'Workspace', icon: '🧭' },
] as const;

interface UserProfile {
  userId: string;
  email: string;
  name: string;
}

interface ProgressResponse {
  stats: {
    totalTopics: number;
    averageAccuracy: string | number;
    totalQuizzes: number;
    weakTopics: string[];
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] =
    useState<(typeof settingsSections)[number]['id']>('profile');
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalTopics: 0,
    totalQuizzes: 0,
    flashcardSets: 0,
    averageAccuracy: 0,
  });

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: 'Turning searches into notes, quizzes, and flashcards.',
  });
  const [learning, setLearning] = useState({
    dailyGoal: 30,
    focus: 'balanced',
    reminders: 'evening',
  });
  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    weeklyDigest: true,
    activityHighlights: true,
  });
  const [privacy, setPrivacy] = useState({
    saveHistory: true,
    profileSummary: true,
  });

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [userResponse, progressResponse, notesResponse, flashcardsResponse] =
          await Promise.all([
            authAPI.verify(),
            progressAPI.getAll(),
            notesAPI.getAll(),
            flashcardsAPI.getAll(),
          ]);

        const profileData = userResponse.data as UserProfile;
        const progressData = progressResponse.data as ProgressResponse;
        const notes = notesResponse.data as unknown[];
        const flashcards = flashcardsResponse.data as unknown[];

        setUser(profileData);
        setProfile((current) => ({
          ...current,
          name: profileData.name,
          email: profileData.email,
        }));
        setStats({
          totalTopics: progressData.stats.totalTopics || notes.length,
          totalQuizzes: Number(progressData.stats.totalQuizzes || 0),
          flashcardSets: flashcards.length,
          averageAccuracy: Math.round(
            Number(progressData.stats.averageAccuracy || 0),
          ),
        });
      } catch (error) {
        toast.error('Unable to load your profile settings right now.');
      }
    };

    void loadSettingsData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile preferences saved locally.');
    }, 600);
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out');
    void router.push('/login');
  };

  return (
    <>
      <Head>
        <title>Settings - NoteMind</title>
        <meta
          name="description"
          content="Manage your profile overview, workspace shortcuts, and study preferences."
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
              <p className="mb-2 text-xs font-inter font-medium uppercase tracking-[0.2em] text-accent-purple">
                Settings
              </p>
              <h1 className="text-4xl font-playfair font-bold gradient-text sm:text-5xl">
                Profile & Workspace
              </h1>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
              <div className="space-y-6">
                <GlassCard className="p-6" glow>
                  <p className="text-xs uppercase tracking-wider text-white/30">
                    Profile Overview
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-pink/20 text-3xl">
                      {user?.name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                    <div>
                      <h2 className="text-xl font-playfair font-bold text-white">
                        {profile.name || 'Learner'}
                      </h2>
                      <p className="text-sm text-white/45">{profile.email}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-white/50">
                    {profile.bio}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/25">
                        Topics
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white/80">
                        {stats.totalTopics}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/25">
                        Accuracy
                      </p>
                      <p className="mt-1 text-xl font-semibold text-white/80">
                        {stats.averageAccuracy}%
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-3">
                  <p className="px-3 pb-2 pt-1 text-xs uppercase tracking-wider text-white/30">
                    Services
                  </p>
                  <div className="space-y-2">
                    {[
                      { href: '/notebook', label: 'Notebook', icon: '📝' },
                      { href: '/quiz', label: 'Quiz', icon: '🎯' },
                      { href: '/flashcards', label: 'Flashcards', icon: '🗂' },
                      { href: '/library', label: 'Library', icon: '📚' },
                      { href: '/dashboard', label: 'Dashboard', icon: '📈' },
                    ].map((service) => (
                      <Link href={service.href} key={service.href}>
                        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/65 transition-all hover:bg-white/[0.03] hover:text-white/85">
                          <span>{service.icon}</span>
                          <span className="font-inter">{service.label}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-2">
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full rounded-xl px-4 py-3 text-left font-inter text-sm transition-all ${
                        activeSection === section.id
                          ? 'border border-accent-purple/30 bg-gradient-to-r from-accent-purple/15 to-accent-pink/10 text-white'
                          : 'text-white/55 hover:bg-white/[0.02] hover:text-white/80'
                      }`}
                    >
                      <span className="mr-2">{section.icon}</span>
                      {section.label}
                    </button>
                  ))}
                </GlassCard>
              </div>

              <div className="space-y-6">
                {activeSection === 'profile' && (
                  <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-playfair font-bold text-white">
                      Personal Details
                    </h2>
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Full Name
                        </label>
                        <input
                          value={profile.name}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              name: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white focus:border-accent-purple/40 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Email
                        </label>
                        <input
                          value={profile.email}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              email: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white focus:border-accent-purple/40 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm text-white/60">
                          Bio
                        </label>
                        <textarea
                          rows={4}
                          value={profile.bio}
                          onChange={(e) =>
                            setProfile((current) => ({
                              ...current,
                              bio: e.target.value,
                            }))
                          }
                          className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white focus:border-accent-purple/40 focus:outline-none"
                        />
                      </div>
                      <GradientButton
                        onClick={handleSaveProfile}
                        loading={saving}
                        size="md"
                        icon="💾"
                      >
                        Save Profile
                      </GradientButton>
                    </div>
                  </GlassCard>
                )}

                {activeSection === 'learning' && (
                  <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-playfair font-bold text-white">
                      Learning Setup
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="mb-3 block text-sm text-white/60">
                          Daily Goal
                        </label>
                        <input
                          type="range"
                          min="15"
                          max="180"
                          step="15"
                          value={learning.dailyGoal}
                          onChange={(e) =>
                            setLearning((current) => ({
                              ...current,
                              dailyGoal: Number(e.target.value),
                            }))
                          }
                          className="w-full accent-purple-500"
                        />
                        <p className="mt-2 text-sm text-white/45">
                          {learning.dailyGoal} minutes per day
                        </p>
                      </div>
                      <div>
                        <label className="mb-3 block text-sm text-white/60">
                          Study Style
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {['balanced', 'quiz-first', 'review-first'].map((option) => (
                            <button
                              key={option}
                              onClick={() =>
                                setLearning((current) => ({
                                  ...current,
                                  focus: option,
                                }))
                              }
                              className={`rounded-xl px-4 py-3 text-sm capitalize transition-all ${
                                learning.focus === option
                                  ? 'border border-accent-purple/30 bg-accent-purple/15 text-white'
                                  : 'border border-white/[0.08] bg-white/[0.03] text-white/55'
                              }`}
                            >
                              {option.replace('-', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {activeSection === 'notifications' && (
                  <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-playfair font-bold text-white">
                      Notification Preferences
                    </h2>
                    <div className="space-y-4">
                      {[
                        ['dailyReminders', 'Daily study reminders'],
                        ['weeklyDigest', 'Weekly digest summary'],
                        ['activityHighlights', 'Highlights from your latest study activity'],
                      ].map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
                        >
                          <span className="text-sm text-white/70">{label}</span>
                          <input
                            type="checkbox"
                            checked={notifications[key as keyof typeof notifications]}
                            onChange={(e) =>
                              setNotifications((current) => ({
                                ...current,
                                [key]: e.target.checked,
                              }))
                            }
                            className="h-5 w-5 accent-purple-500"
                          />
                        </label>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {activeSection === 'privacy' && (
                  <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-playfair font-bold text-white">
                      Privacy Controls
                    </h2>
                    <div className="space-y-4">
                      <label className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                        <span className="text-sm text-white/70">
                          Save study history in the library
                        </span>
                        <input
                          type="checkbox"
                          checked={privacy.saveHistory}
                          onChange={(e) =>
                            setPrivacy((current) => ({
                              ...current,
                              saveHistory: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 accent-purple-500"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                        <span className="text-sm text-white/70">
                          Show profile summary on dashboard
                        </span>
                        <input
                          type="checkbox"
                          checked={privacy.profileSummary}
                          onChange={(e) =>
                            setPrivacy((current) => ({
                              ...current,
                              profileSummary: e.target.checked,
                            }))
                          }
                          className="h-5 w-5 accent-purple-500"
                        />
                      </label>
                    </div>
                  </GlassCard>
                )}

                {activeSection === 'workspace' && (
                  <GlassCard className="p-8">
                    <h2 className="mb-6 text-2xl font-playfair font-bold text-white">
                      Workspace Snapshot
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/25">
                          Notes Saved
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white/80">
                          {stats.totalTopics}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/25">
                          Quizzes Taken
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white/80">
                          {stats.totalQuizzes}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-[10px] uppercase tracking-wider text-white/25">
                          Flashcard Sets
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-white/80">
                          {stats.flashcardSets}
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <GradientButton
                        size="md"
                        icon="📚"
                        onClick={() => void router.push('/library')}
                      >
                        Open Library
                      </GradientButton>
                      <GradientButton
                        size="md"
                        variant="secondary"
                        icon="📈"
                        onClick={() => void router.push('/dashboard')}
                      >
                        View Dashboard
                      </GradientButton>
                      <GradientButton
                        size="md"
                        variant="ghost"
                        icon="🚪"
                        onClick={handleLogout}
                      >
                        Logout
                      </GradientButton>
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
