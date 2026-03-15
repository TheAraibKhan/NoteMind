'use client';

import { motion } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PageLayout from '@/components/PageLayout';
import TopicInput from '@/components/TopicInput';
import GlassCard from '@/components/GlassCard';
import GradientButton from '@/components/GradientButton';

const features = [
  {
    icon: '📝',
    title: 'AI-Powered Notes',
    description:
      'Turn a rough topic into clear, structured notes you can actually revise from.',
    color: 'from-purple-500/20 to-transparent',
  },
  {
    icon: '🎯',
    title: 'Smart Quizzes',
    description:
      'Practice with generated questions that highlight what still needs work.',
    color: 'from-pink-500/20 to-transparent',
  },
  {
    icon: '🔁',
    title: 'Flashcards',
    description:
      'Revisit the same topic in a faster format with focused flashcard rounds.',
    color: 'from-amber-500/20 to-transparent',
  },
  {
    icon: '📊',
    title: 'Learning Dashboard',
    description:
      'See your accuracy, weak spots, and study streaks in one place.',
    color: 'from-green-500/20 to-transparent',
  },
  {
    icon: '🧠',
    title: 'Adaptive Learning',
    description:
      'The experience leans into weaker topics so revision feels more intentional.',
    color: 'from-blue-500/20 to-transparent',
  },
  {
    icon: '⚡',
    title: 'Quick Revision',
    description:
      'Use short summaries and key points when you need a fast refresh.',
    color: 'from-orange-500/20 to-transparent',
  },
];

const stats = [
  { number: '1M+', label: 'Topics Mastered' },
  { number: '500K+', label: 'Active Learners' },
  { number: '98%', label: 'Success Rate' },
];

const startOptions = [
  {
    title: 'Guided Tour',
    description:
      'Get a personalized onboarding flow and set your learning goals.',
    icon: '🗺️',
    href: '/onboarding',
    color: 'from-purple-500/20',
    cta: '5 minutes ->',
  },
  {
    title: 'Jump to Dashboard',
    description:
      'Start exploring your learning dashboard and track your progress.',
    icon: '📊',
    href: '/dashboard',
    color: 'from-blue-500/20',
    cta: 'Explore ->',
  },
  {
    title: 'Preferences',
    description:
      'Customize your learning experience and notification settings.',
    icon: '⚙️',
    href: '/settings',
    color: 'from-green-500/20',
    cta: 'Customize ->',
  },
];

const steps = [
  {
    step: '01',
    title: 'Enter a Topic',
    desc: 'Type any subject, concept, or chapter - from quantum physics to JavaScript closures.',
    icon: '🔍',
  },
  {
    step: '02',
    title: 'AI Generates Content',
    desc: 'Get structured notes, adaptive quizzes, and flashcards shaped around the topic.',
    icon: '🧠',
  },
  {
    step: '03',
    title: 'Master and Track',
    desc: 'Study, test yourself, and watch your progress grow on your personal dashboard.',
    icon: '🏆',
  },
];

export default function Home() {
  const router = useRouter();

  const handleSubmit = (topic: string) => {
    void router.push(`/notebook?topic=${encodeURIComponent(topic)}`);
  };

  const handleQuizSubmit = (topic: string) => {
    void router.push(`/quiz?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <>
      <Head>
        <title>NoteMind - From Notes to Mastery | AI Learning Platform</title>
      </Head>

      <PageLayout>
        <section
          className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12"
          id="hero"
        >
          <div className="w-full max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 font-inter">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Powered by AI • Free to use
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center mb-12"
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-playfair font-bold mb-6 leading-[1.1]">
                <span className="gradient-text">NoteMind</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/60 mb-3 font-inter font-light">
                Turn Any Topic Into <span className="text-white/90 font-normal">Mastery</span>
              </p>
              <p className="text-sm sm:text-base text-white/35 max-w-xl mx-auto leading-relaxed font-inter">
                The AI learning platform that does not just explain - it helps you understand.
                Generate structured notes, adaptive quizzes, and flashcards instantly.
              </p>
            </motion.div>

            <TopicInput onSubmit={handleSubmit} onQuizSubmit={handleQuizSubmit} />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-3 gap-4 mt-16 max-w-lg mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="text-center"
                >
                  <p className="text-2xl sm:text-3xl font-bold font-inter text-white/90 mb-1">
                    {stat.number}
                  </p>
                  <p className="text-xs text-white/35 font-inter">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="section-padding" id="features">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <p className="text-xs font-inter font-medium text-accent-purple uppercase tracking-[0.2em] mb-3">
                Features
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold gradient-text mb-4">
                Intelligent Learning Features
              </h2>
              <p className="text-white/40 max-w-lg mx-auto font-inter text-sm">
                Everything you need to master any subject, without making the workflow feel robotic.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <GlassCard className="h-full group" glow>
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-base font-playfair font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white/40 text-sm font-inter leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding" id="how-it-works">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <p className="text-xs font-inter font-medium text-accent-pink uppercase tracking-[0.2em] mb-3">
                How it works
              </p>
              <h2 className="text-3xl sm:text-4xl font-playfair font-bold gradient-text">
                Three Steps to Mastery
              </h2>
            </motion.div>

            <div className="space-y-6">
              {steps.map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <GlassCard
                    hover={false}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-6"
                  >
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-3xl">{item.icon}</span>
                      <span className="text-4xl font-playfair font-bold text-white/[0.08]">
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-playfair font-bold text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/40 font-inter">{item.desc}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding" id="quick-start">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <p className="text-xs font-inter font-medium text-accent-purple uppercase tracking-[0.2em] mb-3">
                Getting Started
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold gradient-text mb-4">
                Your Learning Path Awaits
              </h2>
              <p className="text-white/40 max-w-lg mx-auto font-inter text-sm">
                Choose the pace that fits how you like to study.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {startOptions.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={item.href}>
                    <GlassCard
                      hover={true}
                      className={`p-8 h-full cursor-pointer bg-gradient-to-br ${item.color} to-transparent`}
                    >
                      <div className="text-4xl mb-4">{item.icon}</div>
                      <h3 className="text-lg font-playfair font-bold text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-white/50 mb-4">{item.description}</p>
                      <div className="inline-block px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 font-inter group-hover:bg-white/[0.08]">
                        {item.cta}
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding" id="cta">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <GlassCard
              hover={false}
              className="p-10 sm:p-14 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-accent-purple/30 rounded-full blur-[80px]" />
                <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-accent-pink/30 rounded-full blur-[80px]" />
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-playfair font-bold mb-4 gradient-text leading-tight">
                  Learning is not memorizing -
                  <br />
                  it is understanding.
                </h2>
                <p className="text-white/50 mb-8 font-inter text-sm max-w-md mx-auto">
                  Start your journey toward real mastery. Build notes, revise smarter,
                  and keep momentum with a workflow that feels like a study companion.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/register">
                    <GradientButton size="lg" icon="✨">
                      Get Started Free
                    </GradientButton>
                  </Link>
                  <Link href="/onboarding">
                    <GradientButton variant="outline" size="lg">
                      Take a Tour
                    </GradientButton>
                  </Link>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </section>
      </PageLayout>
    </>
  );
}
