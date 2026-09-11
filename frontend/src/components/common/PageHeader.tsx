import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`pb-4 border-b border-slate-200/80 mb-5 sm:mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-xs text-slate-400 mb-2 overflow-x-auto">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-slate-600 transition-colors font-medium whitespace-nowrap">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-slate-600 font-semibold whitespace-nowrap">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-relaxed">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">{action}</div>}
      </div>
    </div>
  );
}
