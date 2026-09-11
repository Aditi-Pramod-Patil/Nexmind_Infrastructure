import React from 'react';
import { FolderKanban } from 'lucide-react';
import { Card } from './Card';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderKanban,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <Card className={`p-8 text-center max-w-md mx-auto my-6 border border-slate-200 bg-white shadow-2xs rounded-xl ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-500 mx-auto mb-4">
        <Icon className="w-6 h-6 text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed mb-5">{description}</p>
      {action && <div className="flex justify-center">{action}</div>}
    </Card>
  );
}
