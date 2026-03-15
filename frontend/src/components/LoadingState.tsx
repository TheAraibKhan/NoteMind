'use client';

import { motion } from 'framer-motion';

interface LoadingStateProps {
  message?: string;
  variant?: 'inline' | 'fullscreen' | 'card';
}

export default function LoadingState({
  message = 'Generating with AI...',
  variant = 'card',
}: LoadingStateProps) {
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3">
        <div className="loading-spinner" />
        <span className="text-sm text-white/60">{message}</span>
      </div>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-effect rounded-2xl p-12 text-center max-w-sm mx-4"
        >
          <AIBrain />
          <p className="text-white/80 mt-4 font-inter">{message}</p>
          <div className="loading-dots mt-4 flex justify-center">
            <span />
            <span />
            <span />
          </div>
        </motion.div>
      </div>
    );
  }

  // card variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl p-8 text-center"
    >
      <AIBrain />
      <p className="text-white/80 mt-4 font-inter font-medium">{message}</p>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: i === 0 ? '#a855f7' : i === 1 ? '#ec4899' : '#fbbf24',
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {/* Skeleton preview */}
      <div className="mt-6 space-y-3">
        <div className="skeleton skeleton-title mx-auto" />
        <div className="skeleton skeleton-text w-full" />
        <div className="skeleton skeleton-text w-4/5" />
        <div className="skeleton skeleton-text w-3/5" />
      </div>
    </motion.div>
  );
}

function AIBrain() {
  return (
    <motion.div
      className="relative w-16 h-16 mx-auto"
      animate={{ rotate: [0, 5, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, #a855f7, #ec4899, #fbbf24, #a855f7)',
          filter: 'blur(8px)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[3px] rounded-full bg-[#0a0a0a] flex items-center justify-center">
        <span className="text-2xl">🧠</span>
      </div>
    </motion.div>
  );
}
