'use client';

import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

interface QuizCardProps {
  question: string;
  options: string[];
  selectedOption: number | null;
  onSelect: (index: number) => void;
  submitted: boolean;
  correctAnswer: number;
}

const optionLabels = ['A', 'B', 'C', 'D'];

export default function QuizCard({
  question,
  options,
  selectedOption,
  onSelect,
  submitted,
  correctAnswer,
}: QuizCardProps) {
  return (
    <GlassCard className="max-w-2xl mx-auto" hover={false}>
      <h3 className="text-xl font-playfair font-bold mb-8 text-white leading-relaxed">
        {question}
      </h3>

      <div className="space-y-3">
        {options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === correctAnswer;

          let borderColor = 'border-white/[0.08]';
          let bgColor = 'bg-white/[0.02]';
          let textColor = 'text-white/70';
          let labelBg = 'bg-white/[0.06] text-white/40';

          if (submitted && isCorrect) {
            borderColor = 'border-green-500/40';
            bgColor = 'bg-green-500/[0.08]';
            textColor = 'text-green-300';
            labelBg = 'bg-green-500/20 text-green-300';
          } else if (submitted && isSelected && !isCorrect) {
            borderColor = 'border-red-500/40';
            bgColor = 'bg-red-500/[0.08]';
            textColor = 'text-red-300';
            labelBg = 'bg-red-500/20 text-red-300';
          } else if (isSelected && !submitted) {
            borderColor = 'border-accent-purple/50';
            bgColor = 'bg-accent-purple/[0.08]';
            textColor = 'text-white';
            labelBg = 'bg-accent-purple/30 text-accent-purple';
          }

          return (
            <motion.button
              key={idx}
              whileHover={!submitted ? { x: 4, backgroundColor: 'rgba(255,255,255,0.04)' } : {}}
              whileTap={!submitted ? { scale: 0.99 } : {}}
              onClick={() => !submitted && onSelect(idx)}
              disabled={submitted}
              className={`w-full p-4 rounded-xl border text-left transition-all duration-300 flex items-center gap-4 ${borderColor} ${bgColor} ${
                submitted ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              {/* Option label */}
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-inter flex-shrink-0 transition-all ${labelBg}`}
              >
                {optionLabels[idx]}
              </span>
              <span className={`font-inter text-sm ${textColor} transition-colors`}>
                {option}
              </span>
              {/* Status icons */}
              {submitted && isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto text-green-400 flex-shrink-0"
                >
                  ✓
                </motion.span>
              )}
              {submitted && isSelected && !isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto text-red-400 flex-shrink-0"
                >
                  ✗
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-6 p-4 rounded-xl border ${
            selectedOption === correctAnswer
              ? 'bg-green-500/[0.06] border-green-500/20'
              : 'bg-red-500/[0.06] border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-inter font-semibold">
              {selectedOption === correctAnswer ? (
                <span className="text-green-400">✓ Correct!</span>
              ) : (
                <span className="text-red-400">✗ Incorrect</span>
              )}
            </span>
          </div>
          {selectedOption !== correctAnswer && (
            <p className="text-xs text-white/50 font-inter">
              The correct answer is <span className="text-accent-purple font-medium">{optionLabels[correctAnswer]}</span>
            </p>
          )}
        </motion.div>
      )}
    </GlassCard>
  );
}
