import React from 'react';
import { TrendingUp } from 'lucide-react';

interface PlannedVsActualBoxGraphProps {
  baselineProgress?: number;
  actualProgress?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PlannedVsActualBoxGraph({
  baselineProgress = 100,
  actualProgress = 0,
  title = "Planned vs Actual Field Progress Box Graph",
  subtitle = "Comparative baseline target schedule vs live database task execution progress.",
  className = ""
}: PlannedVsActualBoxGraphProps) {
  const diff = baselineProgress - actualProgress;
  const isBehind = diff > 0;
  const behindPercent = Math.abs(diff);

  return (
    <div className={`p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4 ${className}`}>
      {/* Header section */}
      <div className="space-y-2 pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h3>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-lg text-xs font-bold shadow-2xs whitespace-nowrap">
              Planned Baseline: {baselineProgress}%
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-bold shadow-2xs whitespace-nowrap">
              Actual Field: {actualProgress}%
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 font-medium pl-0.5">
          {subtitle}
        </p>
      </div>

      {/* Execution status & Progress bars */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-800 font-extrabold">Schedule Execution Status</span>
          <span className={isBehind ? "text-orange-600 font-extrabold" : "text-emerald-600 font-extrabold"}>
            {isBehind ? `${behindPercent.toFixed(1)}% Behind Schedule` : "On Schedule"}
          </span>
        </div>

        {/* Planned Baseline Target Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Planned Baseline Target</span>
            <span className="text-slate-900 font-bold">{baselineProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${Math.min(baselineProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Actual Field Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600">Actual Field Progress</span>
            <span className="text-emerald-600 font-extrabold">{actualProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${Math.min(actualProgress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
