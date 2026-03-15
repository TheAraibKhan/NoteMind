'use client';

import { ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import GlassCard from './GlassCard';

interface DashboardWidgetProps {
  title: string;
  value?: string | number;
  children?: ReactNode;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
}

export default function DashboardWidget({
  title,
  value,
  children,
  icon,
  trend,
  accentColor = 'accent-purple',
}: DashboardWidgetProps) {
  return (
    <GlassCard glow>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-inter text-sm font-medium text-white/50 uppercase tracking-wider">
          {title}
        </h3>
        {icon && (
          <div className="text-2xl opacity-80">{icon}</div>
        )}
      </div>

      {value && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl font-bold font-inter text-white mb-1"
        >
          {value}
        </motion.p>
      )}

      {trend && (
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`text-xs font-medium ${
              trend.value >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-white/30">{trend.label}</span>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
