'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import React from 'react';
import GradientButton from './GradientButton';

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  onQuizSubmit?: (topic: string) => void;
  loading?: boolean;
  placeholder?: string;
}

const suggestions = [
  'Machine Learning',
  'Data Structures',
  'React Hooks',
  'SQL Joins',
  'REST APIs',
  'Binary Trees',
];

export default function TopicInput({
  onSubmit,
  onQuizSubmit,
  loading = false,
  placeholder = 'What do you want to learn today?',
}: TopicInputProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const topic = input.trim();
    if (topic) {
      onSubmit(topic);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    onSubmit(suggestion);
  };

  const handleQuizClick = () => {
    const topic = input.trim();
    if (!topic) {
      return;
    }

    if (onQuizSubmit) {
      onQuizSubmit(topic);
      return;
    }

    onSubmit(topic);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <div
          className={`
            relative rounded-2xl p-[1px] transition-all duration-500
            ${
              focused
                ? 'bg-gradient-to-r from-accent-purple via-accent-pink to-accent-gold shadow-lg shadow-purple-500/20'
                : 'bg-white/[0.1]'
            }
          `}
        >
          <div className="flex flex-col gap-2 rounded-2xl bg-[#0a0a0a] p-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                className="w-full bg-transparent px-4 py-3 text-base font-inter text-white/90 placeholder:text-white/30 focus:outline-none"
                id="topic-input"
              />
              {!input && !focused && (
                <motion.div
                  className="absolute right-4 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-accent-purple/50"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <GradientButton
                type="submit"
                size="md"
                loading={loading}
                disabled={!input.trim() || loading}
                icon="✨"
              >
                Generate Notes
              </GradientButton>
              <GradientButton
                type="button"
                size="md"
                variant="secondary"
                loading={loading}
                disabled={!input.trim() || loading}
                icon="🎯"
                onClick={handleQuizClick}
              >
                Quiz
              </GradientButton>
            </div>
          </div>
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        <span className="text-xs font-inter text-white/30">Try:</span>
        {suggestions.map((suggestion, i) => (
          <motion.button
            key={suggestion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.05 }}
            onClick={() => handleSuggestionClick(suggestion)}
            className="rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1 text-xs text-white/40 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white/70"
            type="button"
          >
            {suggestion}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
