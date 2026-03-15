'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardProps {
  front: string;
  back: string;
}

export default function Flashcard({ front, back }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative h-72 cursor-pointer"
      style={{ perspective: '1200px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl glass-effect border border-white/[0.08] p-8 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute top-4 left-4">
            <span className="text-xs font-inter font-medium text-accent-purple/60 uppercase tracking-wider">
              Question
            </span>
          </div>
          <p className="text-xl font-playfair font-bold gradient-text leading-relaxed">
            {front}
          </p>
          <div className="absolute bottom-4 flex items-center gap-2 text-white/30">
            <motion.div
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border border-white/20 rounded"
            />
            <span className="text-xs font-inter">Click to reveal</span>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl p-8 flex flex-col items-center justify-center text-center border"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(236, 72, 153, 0.06))',
            borderColor: 'rgba(168, 85, 247, 0.2)',
          }}
        >
          <div className="absolute top-4 left-4">
            <span className="text-xs font-inter font-medium text-accent-pink/60 uppercase tracking-wider">
              Answer
            </span>
          </div>
          <p className="text-lg font-inter text-white/90 leading-relaxed">
            {back}
          </p>
          <div className="absolute bottom-4 flex items-center gap-2 text-white/30">
            <span className="text-xs font-inter">Click to flip back</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
