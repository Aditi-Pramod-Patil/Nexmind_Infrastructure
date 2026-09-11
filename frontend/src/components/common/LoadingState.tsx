import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading data...', className = '' }: LoadingStateProps) {
  return (
    <div className={`p-12 text-center text-xs font-semibold text-slate-500 flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      <span>{message}</span>
    </div>
  );
}
