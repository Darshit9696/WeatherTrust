'use client';

import React from 'react';
import { SummaryStatistics } from '@/lib/types';
import { Activity, AlertTriangle, Flame, HelpCircle } from 'lucide-react';

interface SummaryCardsProps {
  stats: SummaryStatistics;
  totalObservations: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ stats, totalObservations }) => {
  const breakdown = stats.classification_breakdown;
  const totalSensorEvals = stats.total_sensor_evaluations || totalObservations * 10;
  const faultPct = ((breakdown.PROBABLE_SENSOR_FAULT / totalSensorEvals) * 100).toFixed(2);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Total Observations */}
      <div className="bg-surface-elevated/50 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Observations</span>
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {totalObservations.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalSensorEvals.toLocaleString()} sensor evaluations
          </div>
        </div>
      </div>

      {/* 2. Probable Sensor Faults */}
      <div className="bg-surface-elevated/50 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between text-rose-300 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Probable Sensor Faults</span>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight font-mono">
            {breakdown.PROBABLE_SENSOR_FAULT.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">
            {faultPct}% of total evaluations
          </div>
        </div>
      </div>

      {/* 3. Possible Weather Extremes */}
      <div className="bg-surface-elevated/50 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center justify-between text-amber-300 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Possible Weather Extremes</span>
          <Flame className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight font-mono">
            {breakdown.POSSIBLE_WEATHER_EXTREME.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">
            Meteorologically consistent
          </div>
        </div>
      </div>

      {/* 4. Uncertain Observations */}
      <div className="bg-surface-elevated/50 border border-surface-border rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Uncertain Warnings</span>
          <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            {breakdown.UNCERTAIN.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Requires additional evidence
          </div>
        </div>
      </div>
    </div>
  );
};
