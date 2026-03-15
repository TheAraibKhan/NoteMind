'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  const createParticle = useCallback((width: number, height: number): Particle => {
    const maxLife = Math.random() * 200 + 100;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      life: maxLife,
      maxLife,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Detect mobile for performance optimization
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 20 : 35;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();

    // Initialize particles
    const width = window.innerWidth;
    const height = window.innerHeight;
    particlesRef.current = Array.from({ length: particleCount }, () =>
      createParticle(width, height)
    );

    const colors = [
      [168, 85, 247],  // purple
      [236, 72, 153],  // pink
      [251, 191, 36],  // gold
    ];

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.5;

        // Soft wrap
        if (particle.x < -10) particle.x = window.innerWidth + 10;
        if (particle.x > window.innerWidth + 10) particle.x = -10;
        if (particle.y < -10) particle.y = window.innerHeight + 10;
        if (particle.y > window.innerHeight + 10) particle.y = -10;

        // Fade based on life
        const lifeRatio = particle.life / particle.maxLife;
        const alpha = lifeRatio * particle.opacity;

        if (alpha > 0.01) {
          const color = colors[index % colors.length];
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.radius * 2
          );
          gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
          gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Regenerate dead particles
        if (particle.life <= 0) {
          particlesRef.current[index] = createParticle(
            window.innerWidth,
            window.innerHeight
          );
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}
