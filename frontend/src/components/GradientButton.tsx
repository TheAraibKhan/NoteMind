'use client';

import { ButtonHTMLAttributes, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { motion } from 'framer-motion';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function GradientButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className: customClassName,
  onClick,
  ...props
}: GradientButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    // Ripple effect
    if (buttonRef.current && variant === 'primary') {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      ripple.className = 'ripple';
      buttonRef.current.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }
    onClick?.(e);
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  const variants = {
    primary:
      'bg-gradient-to-r from-accent-purple via-accent-pink to-accent-purple bg-[length:200%_100%] hover:bg-right text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 ripple-container',
    secondary:
      'bg-white/[0.04] border border-white/[0.1] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.2] hover:text-white',
    outline:
      'border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 hover:border-accent-purple',
    ghost:
      'text-white/60 hover:text-white hover:bg-white/[0.06]',
  };

  const baseClassName = `
    ${sizes[size]}
    ${variants[variant]}
    rounded-xl font-inter font-medium
    transition-all duration-300
    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
    inline-flex items-center justify-center gap-2
    relative overflow-hidden
  `;

  const finalClassName = customClassName
    ? `${baseClassName} ${customClassName}`
    : baseClassName;

  return (
    <motion.button
      ref={buttonRef}
      whileHover={{ scale: props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: props.disabled ? 1 : 0.97 }}
      className={finalClassName}
      disabled={loading || props.disabled}
      onClick={handleClick}
      {...(props as any)}
    >
      {loading ? (
        <>
          <div className="loading-spinner" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {icon && <span className="text-base">{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  );
}
