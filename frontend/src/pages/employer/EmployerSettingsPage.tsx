import React from 'react';
import { Card } from '../../components/common/Card';
import { Settings, Shield, Sliders, Database, Bell } from 'lucide-react';

export function EmployerSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F33]">Workspace Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage Primavera schedule sync preferences and reconciliation rules.</p>
      </div>

      <Card className="space-y-4">
        <h3 className="text-base font-bold text-[#0B1F33]">Activity Reconciliation Rules</h3>
        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 block">Auto-Approve Matches &gt; 90% Confidence</span>
              <span className="text-slate-500 text-[11px]">Automatically update Primavera baseline progress when confidence exceeds 90%.</span>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <div>
              <span className="font-bold text-slate-800 block">Require Planner Review for Low-Confidence Matches</span>
              <span className="text-slate-500 text-[11px]">Flag matches below 75% for manual planner confirmation.</span>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
          </label>
        </div>
      </Card>
    </div>
  );
}
