'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Notebook', href: '/notebook' },
  { label: 'Quiz', href: '/quiz' },
  { label: 'Flashcards', href: '/flashcards' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Library', href: '/library' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'glass-effect-strong border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110">
              N
            </div>
            <span className="text-lg font-bold font-playfair gradient-text">
              NoteMind
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/settings"
              className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
              title="Settings"
            >
              ⚙️
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-all"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-accent-purple to-accent-pink rounded-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 active:scale-95"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden relative w-8 h-8 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <div className="w-5 flex flex-col gap-1.5">
              <motion.div
                animate={isOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
                className="w-full h-[1.5px] bg-white/80 rounded-full origin-center"
                transition={{ duration: 0.2 }}
              />
              <motion.div
                animate={isOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                className="w-full h-[1.5px] bg-white/80 rounded-full"
                transition={{ duration: 0.2 }}
              />
              <motion.div
                animate={isOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
                className="w-full h-[1.5px] bg-white/80 rounded-full origin-center"
                transition={{ duration: 0.2 }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden overflow-hidden"
            >
              <div className="pb-4 pt-2 space-y-1">
                {navLinks.map((link, i) => {
                  const isActive = router.pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        className={`block px-4 py-2.5 rounded-lg text-sm transition-all ${
                          isActive
                            ? 'bg-accent-purple/10 text-accent-purple border-l-2 border-accent-purple'
                            : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}
                {/* Mobile Auth */}
                <div className="pt-3 mt-3 border-t border-white/[0.06] flex gap-2 px-4">
                  <Link
                    href="/auth"
                    className="flex-1 py-2.5 text-sm text-white/60 rounded-lg border border-white/10 hover:bg-white/[0.04] transition-all text-center"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth"
                    className="flex-1 py-2.5 text-sm font-medium bg-gradient-to-r from-accent-purple to-accent-pink rounded-lg transition-all active:scale-95 text-center"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
