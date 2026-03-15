'use client';

import { ReactNode, useRef, MouseEvent } from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glow?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  hover = true,
  glow = false,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hover) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={
        hover
          ? {
              y: -4,
              transition: { duration: 0.2 },
            }
          : {}
      }
      onMouseMove={handleMouseMove}
      className={`
        relative rounded-2xl p-6 backdrop-blur-xl
        bg-white/[0.03] border border-white/[0.08]
        transition-all duration-300
        ${hover ? 'hover:border-white/[0.15] hover:bg-white/[0.05]' : ''}
        ${glow ? 'hover-glow' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        ...(hover
          ? {
              background: `
                radial-gradient(
                  200px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                  rgba(168, 85, 247, 0.06),
                  transparent 60%
                ),
                rgba(255, 255, 255, 0.03)
              `,
            }
          : {}),
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
