'use client';

import React from 'react';
import { SensorHealthRecord } from '@/lib/types';
import { SENSOR_DISPLAY_NAMES } from '@/lib/data';
import { ShieldCheck, Info, AlertOctagon } from 'lucide-react';

interface SensorHealthPanelProps {
  healthRecords: Record<string, SensorHealthRecord>;
  selectedSensor?: string;
  onSelectSensor?: (sensor: string) => void;
}

export const SensorHealthPanel: React.FC<SensorHealthPanelProps> = ({
  healthRecords,
  selectedSensor,
  onSelectSensor,
}) => {
  // Ordered primary sensors
  const displaySensors = [
    'temp_2m',
    'temp_4m',
    'temp_8m',
    'rh_2m',
    'rh_4m',
    'rh_8m',
    'pressure',
    'battery_voltage',
    'wind_speed_10m',
    'rainfall',
  ];

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Sensor Health & Reliability
          </h3>
          <p className="text-xs text-slate-400">
            Real-time dynamic trust scores computed sequentially across 14 months of historical telemetry.
          </p>
        </div>

        {/* Informational Callout */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs">
          <Info className="w-4 h-4 text-brand-400 shrink-0" />
          <span>
            <strong>Health recovery:</strong> Sensors recover score after clean periods. Historical minimum preserves failure severity.
          </span>
        </div>
      </div>

      {/* Grid of Sensor Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {displaySensors.map((sensorKey) => {
          const record = healthRecords[sensorKey];
          if (!record) return null;

          const isSelected = selectedSensor === sensorKey;
          const hasExperiencedFailure = record.minimum_health < 70;

          return (
            <div
              key={sensorKey}
              onClick={() => onSelectSensor && onSelectSensor(sensorKey)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/95 border-brand-500 shadow-md shadow-brand-500/10'
                  : 'bg-surface-elevated/70 border-surface-border hover:border-slate-500 hover:bg-slate-800/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-bold text-white truncate" title={SENSOR_DISPLAY_NAMES[sensorKey]}>
                    {SENSOR_DISPLAY_NAMES[sensorKey] || sensorKey}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      hasExperiencedFailure
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {record.status_grade}
                  </span>
                </div>

                {/* Dual Metric: Current Health vs Historical Minimum */}
                <div className="grid grid-cols-2 gap-2 my-2 py-2 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Current</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {record.current_health.toFixed(0)}
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Historical Min</div>
                    <div
                      className={`text-sm font-bold ${
                        record.minimum_health < 50
                          ? 'text-rose-400'
                          : record.minimum_health < 80
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {record.minimum_health.toFixed(0)}
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Details: Reliability & Fault Counts */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>30d Rel: <strong className="text-white">{record.recent_30_day_reliability.toFixed(1)}%</strong></span>
                <span className="flex items-center gap-1">
                  Faults:
                  <strong className={record.probable_fault_count > 0 ? 'text-rose-400' : 'text-slate-300'}>
                    {record.probable_fault_count}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
