'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import ScrollProgress from './ScrollProgress';
import CursorGlow from './CursorGlow';
import ParticleBackground from './ParticleBackground';

interface PageLayoutProps {
  children: ReactNode;
  showParticles?: boolean;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function PageLayout({
  children,
  showParticles = true,
  className = '',
}: PageLayoutProps) {
  return (
    <>
      <ScrollProgress />
      {showParticles && <ParticleBackground />}
      <CursorGlow />

      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />

        <motion.main
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className={`flex-1 ${className}`}
        >
          {children}
        </motion.main>

        <Footer />
      </div>
    </>
  );
}
