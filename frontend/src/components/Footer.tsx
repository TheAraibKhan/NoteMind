'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'AI Notes', href: '/notebook' },
      { label: 'Smart Quizzes', href: '/quiz' },
      { label: 'Flashcards', href: '/flashcards' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Library', href: '/library' },
      { label: 'Study Guide', href: '#' },
      { label: 'API Docs', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] mt-auto">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-accent-purple/50 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold gradient-text font-playfair">
              NoteMind
            </Link>
            <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-xs">
              The AI-powered learning platform that transforms any topic into mastery.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs text-white/40">All systems operational</span>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="font-inter font-semibold text-white/70 text-sm mb-4 uppercase tracking-wider">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} NoteMind. From Notes to Mastery.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
