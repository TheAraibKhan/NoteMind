'use client';

import { useEffect } from 'react';

export default function CursorGlow() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cursor = document.getElementById('cursor-glow');
      if (!cursor) return;

      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      id="cursor-glow"
      className="fixed w-64 h-64 pointer-events-none -translate-x-1/2 -translate-y-1/2"
      style={{
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
        zIndex: 0,
        filter: 'blur(40px)',
      }}
    />
  );
}
