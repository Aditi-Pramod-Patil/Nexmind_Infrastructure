import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  variant?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  variant = 'blue',
  height = 'md',
  showLabel = false,
  animate = true,
  className = ''
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 100);

  const colors = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
    purple: 'bg-indigo-600',
  };

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-700">
          <span>Progress</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 ${heightStyles[height]}`}>
        {animate ? (
          <motion.div
            className={`h-full rounded-full ${colors[variant]}`}
            initial={{ width: 0 }}
            animate={{ width: `${clamped}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ) : (
          <div
            className={`h-full rounded-full ${colors[variant]}`}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
}
