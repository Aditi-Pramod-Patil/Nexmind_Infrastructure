import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-2xs p-5 transition-all duration-150 ${
        hoverable ? 'hover:border-slate-300 hover:shadow-xs cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
