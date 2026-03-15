'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ParticleBackground from '@/components/ParticleBackground';
import CursorGlow from '@/components/CursorGlow';
import GradientButton from '@/components/GradientButton';

const onboardingSteps = [
  {
    id: 1,
    title: 'Welcome to NoteMind',
    description: 'Transform your learning journey with AI-powered notes, quizzes, and flashcards.',
    icon: '🧠',
    color: 'from-purple-500/20',
  },
  {
    id: 2,
    title: 'Choose Your Learning Path',
    description: 'Select from Science, Mathematics, History, Programming, or create your own custom path.',
    icon: '🎓',
    color: 'from-blue-500/20',
    options: [
      { label: 'Science & Technology', emoji: '🔬' },
      { label: 'Mathematics', emoji: '📐' },
      { label: 'History & Languages', emoji: '📚' },
      { label: 'Programming', emoji: '💻' },
      { label: 'Custom Path', emoji: '🎯' },
    ],
  },
  {
    id: 3,
    title: 'Set Your Goals',
    description: 'Define what you want to achieve. We\'ll help you track progress.',
    icon: '🎯',
    color: 'from-pink-500/20',
    goals: [
      { label: 'Learn a new skill', emoji: '⚡' },
      { label: 'Pass an exam', emoji: '📝' },
      { label: 'Improve existing knowledge', emoji: '📈' },
      { label: 'Quick reference learning', emoji: '🚀' },
    ],
  },
  {
    id: 4,
    title: 'Personalize Your Experience',
    description: 'Set your study duration and notification preferences.',
    icon: '⚙️',
    color: 'from-green-500/20',
  },
  {
    id: 5,
    title: 'You\'re All Set!',
    description: 'Start creating notes, quizzes, and flashcards. Your learning adventure begins now!',
    icon: '🚀',
    color: 'from-orange-500/20',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [studyDuration, setStudyDuration] = useState(30);
  const [enableNotifications, setEnableNotifications] = useState(true);

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save onboarding preferences and redirect
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('learningPath', selectedPath || 'custom');
      localStorage.setItem('studyGoal', selectedGoal || 'general');
      localStorage.setItem('studyDuration', studyDuration.toString());
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    router.push('/dashboard');
  };

  const stepVariants = {
    enter: { opacity: 0, x: 100 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <>
      <Head>
        <title>Welcome to NoteMind - Onboarding</title>
        <meta name="description" content="Get started with NoteMind - your personal learning assistant" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden relative">
        <ParticleBackground />
        <CursorGlow />

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-2xl"
          >
            {/* Progress Bar */}
            <motion.div variants={itemVariants} className="mb-12">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-inter text-white/60">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </p>
                {!isLastStep && (
                  <button
                    onClick={handleSkip}
                    className="text-sm font-inter text-white/40 hover:text-white/60 transition-colors"
                  >
                    Skip
                  </button>
                )}
              </div>
              <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-center"
                >
                  {/* Icon */}
                  <motion.div variants={itemVariants} className="mb-8">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-8xl inline-block"
                    >
                      {step.icon}
                    </motion.div>
                  </motion.div>

                  {/* Title & Description */}
                  <motion.div variants={itemVariants} className="mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
                      {step.title}
                    </h1>
                    <p className="text-xl text-gray-400 max-w-lg mx-auto">
                      {step.description}
                    </p>
                  </motion.div>

                  {/* Step 2: Learning Path Options */}
                  {currentStep === 1 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-3 mb-12"
                    >
                      {step.options?.map((option, idx) => (
                        <motion.button
                          key={idx}
                          variants={itemVariants}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedPath(option.label)}
                          className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                            selectedPath === option.label
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02]'
                          }`}
                        >
                          <span className="text-3xl">{option.emoji}</span>
                          <span className="font-inter font-medium text-white/80">
                            {option.label}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Step 3: Goals Options */}
                  {currentStep === 2 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 gap-3 mb-12 max-w-lg mx-auto"
                    >
                      {step.goals?.map((goal, idx) => (
                        <motion.button
                          key={idx}
                          variants={itemVariants}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedGoal(goal.label)}
                          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            selectedGoal === goal.label
                              ? 'border-pink-500 bg-pink-500/10'
                              : 'border-white/[0.1] hover:border-white/[0.2] bg-white/[0.02]'
                          }`}
                        >
                          <span className="text-3xl">{goal.emoji}</span>
                          <span className="font-inter font-medium text-white/80 text-sm text-center">
                            {goal.label}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Step 4: Preferences */}
                  {currentStep === 3 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-6 mb-12 max-w-lg mx-auto text-left"
                    >
                      <motion.div variants={itemVariants} className="space-y-4">
                        <div>
                          <label className="block text-white/80 font-inter font-semibold mb-4">
                            ⏱️ Daily Study Duration
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="15"
                              max="180"
                              step="15"
                              value={studyDuration}
                              onChange={(e) => setStudyDuration(Number(e.target.value))}
                              className="flex-1 h-2 bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-purple-500"
                            />
                            <span className="text-white/60 font-inter font-medium min-w-16 text-right">
                              {studyDuration} min
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants}>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={enableNotifications}
                            onChange={(e) => setEnableNotifications(e.target.checked)}
                            className="w-5 h-5 rounded bg-white/10 border border-purple-500/30 cursor-pointer accent-purple-500"
                          />
                          <div>
                            <p className="font-inter font-semibold text-white/80 group-hover:text-white transition-colors">
                              🔔 Enable Study Reminders
                            </p>
                            <p className="text-xs text-white/40">
                              Get daily notifications to keep your learning streak alive
                            </p>
                          </div>
                        </label>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Step 5: Success */}
                  {isLastStep && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-6 mb-12"
                    >
                      <motion.div
                        variants={itemVariants}
                        className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20"
                      >
                        <p className="text-white/80 font-inter">
                          You're ready to start your learning journey! Access all features, create notes, generate quizzes, and master any topic.
                        </p>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        className="grid grid-cols-3 gap-3"
                      >
                        <div className="text-center">
                          <p className="text-3xl mb-2">📝</p>
                          <p className="text-xs text-white/60 font-inter">Create Notes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl mb-2">🎯</p>
                          <p className="text-xs text-white/60 font-inter">Take Quizzes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl mb-2">🔄</p>
                          <p className="text-xs text-white/60 font-inter">Use Flashcards</p>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex gap-4 justify-between items-center"
            >
              <button
                onClick={handleBack}
                disabled={isFirstStep}
                className="px-6 py-3 rounded-xl border border-white/[0.1] font-inter font-medium text-white/60 hover:text-white hover:border-white/[0.2] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                ← Back
              </button>

              <div className="flex gap-2">
                {onboardingSteps.map((_, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep ? 'bg-purple-500 w-8' : 'bg-white/20'
                    }`}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <GradientButton
                  onClick={handleNext}
                  className="px-8 py-3"
                >
                  {isLastStep ? 'Start Learning!' : 'Next →'}
                </GradientButton>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
