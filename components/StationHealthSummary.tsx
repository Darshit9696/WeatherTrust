'use client';

import React from 'react';
import { SensorHealthRecord } from '@/lib/types';
import { SENSOR_DISPLAY_NAMES } from '@/lib/data';
import { ShieldCheck, ChevronRight, Activity, AlertOctagon } from 'lucide-react';

interface StationHealthSummaryProps {
  healthRecords: Record<string, SensorHealthRecord>;
  onNavigateToHealth: () => void;
}

export const StationHealthSummary: React.FC<StationHealthSummaryProps> = ({
  healthRecords,
  onNavigateToHealth,
}) => {
  const sensorKeys = Object.keys(healthRecords);
  const totalSensors = sensorKeys.length;

  // Calculate average 30-day reliability across monitored sensors
  const avg30dRel =
    totalSensors > 0
      ? (
          sensorKeys.reduce((acc, k) => acc + (healthRecords[k]?.recent_30_day_reliability || 100), 0) /
          totalSensors
        ).toFixed(1)
      : '100.0';

  // Highlight key sensors with notable historical minimums
  const notableSensors = ['pressure', 'battery_voltage', 'temp_4m', 'temp_8m'];

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-xl p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Station Health Summary</h3>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            HEALTHY AT DATASET END
          </span>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Sensors Monitored</span>
            <span className="text-base font-bold text-white font-mono">{totalSensors}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">30d Avg Reliability</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{avg30dRel}%</span>
          </div>
        </div>

        {/* Noteworthy Sensor Telemetry Rows */}
        <div className="space-y-1.5 text-xs">
          <div className="text-[10px] uppercase font-semibold text-slate-400 px-1">Notable Diagnostics:</div>
          {notableSensors.map((s) => {
            const rec = healthRecords[s];
            if (!rec) return null;
            return (
              <div
                key={s}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 text-xs"
              >
                <span className="text-slate-300 font-medium truncate max-w-[120px]">
                  {SENSOR_DISPLAY_NAMES[s] || s}
                </span>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-emerald-400">Cur {rec.current_health.toFixed(0)}</span>
                  <span className="text-slate-600">/</span>
                  <span
                    className={
                      rec.minimum_health < 50
                        ? 'text-rose-400 font-bold'
                        : rec.minimum_health < 80
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400'
                    }
                  >
                    Min {rec.minimum_health.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation link */}
      <button
        onClick={onNavigateToHealth}
        className="mt-3 w-full py-1.5 px-3 rounded-lg bg-surface-border/50 hover:bg-surface-border text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
      >
        <span>View Full Sensor Health Grid</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
