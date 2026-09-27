'use client';

import React, { useMemo } from 'react';
import { DashboardTimeSeriesPoint, FlaggedEvent } from '@/lib/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { Activity, ArrowRight, AlertTriangle, Flame } from 'lucide-react';

interface TelemetryOverviewPreviewProps {
  data: DashboardTimeSeriesPoint[];
  onOpenWorkspace: () => void;
  onSelectEvent?: (event: FlaggedEvent) => void;
  topAnomalies?: FlaggedEvent[];
}

export const TelemetryOverviewPreview: React.FC<TelemetryOverviewPreviewProps> = ({
  data,
  onOpenWorkspace,
  onSelectEvent,
  topAnomalies,
}) => {
  // Downsample to ~1200 points for crisp 60fps rendering in the preview card
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const step = Math.max(1, Math.floor(data.length / 1200));
    return data.filter((d, idx) => idx % step === 0 || d.is_flagged);
  }, [data]);

  // Find the exact Mar 19 spike and Mar 24 extreme in top anomalies if available
  const mar19Event = useMemo(() => {
    return topAnomalies?.find(
      (a) => a.timestamp.startsWith('2016-03-19 11:30') && a.sensor === 'temp_4m'
    );
  }, [topAnomalies]);

  const mar24Event = useMemo(() => {
    return topAnomalies?.find(
      (a) => a.timestamp.startsWith('2016-03-24 14:00') && a.sensor === 'temp_8m'
    );
  }, [topAnomalies]);

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700/80">
      {/* Header with Title and "Open Telemetry Workspace" Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Telemetry Stream Preview
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Temperature (2m, 4m, 8m)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Colocated multi-height thermal profiles with detected sensor faults and meteorological extremes.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenWorkspace}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500/90 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all hover:translate-x-0.5 whitespace-nowrap"
        >
          <span>Open Telemetry Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact Chart Container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timestamp"
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(ts) => (ts ? ts.substring(0, 7) : '')}
              minTickGap={45}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={[-40, 52]}
              unit="°C"
              ticks={[-40, -20, 0, 20, 40]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload as DashboardTimeSeriesPoint;
                return (
                  <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl shadow-2xl text-[11px] min-w-[200px] backdrop-blur-md">
                    <div className="text-[10px] text-slate-400 font-mono mb-1.5 border-b border-slate-800 pb-1">
                      {label} IST
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sky-400">
                        <span>2m Air Temp:</span>
                        <span className="font-mono font-bold">
                          {d?.temp_2m !== null && d?.temp_2m !== undefined ? `${d.temp_2m.toFixed(1)}°C` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-rose-400">
                        <span>4m Air Temp:</span>
                        <span className="font-mono font-bold">
                          {d?.temp_4m !== null && d?.temp_4m !== undefined ? `${d.temp_4m.toFixed(1)}°C` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-emerald-400">
                        <span>8m Air Temp:</span>
                        <span className="font-mono font-bold">
                          {d?.temp_8m !== null && d?.temp_8m !== undefined ? `${d.temp_8m.toFixed(1)}°C` : '—'}
                        </span>
                      </div>
                    </div>
                    {d?.is_flagged && (
                      <div className="mt-2 pt-1 border-t border-slate-800 flex items-center gap-1 text-[10px] text-amber-300 font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Anomaly Detected at Step</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Colocated Multi-Height Lines */}
            <Line
              type="monotone"
              dataKey="temp_2m"
              name="2m Temp"
              stroke="#38bdf8"
              dot={false}
              strokeWidth={1.25}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="temp_4m"
              name="4m Temp"
              stroke="#f43f5e"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="temp_8m"
              name="8m Temp"
              stroke="#10b981"
              dot={false}
              strokeWidth={1.25}
              isAnimationActive={false}
            />

            {/* Prominent Anomaly Visual Markers */}
            <ReferenceDot
              x="2016-03-19 11:30:00"
              y={-33.4}
              r={5}
              fill="#f43f5e"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <ReferenceDot
              x="2016-03-24 14:00:00"
              y={46.1}
              r={5}
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Status & Legend Bar */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#38bdf8] rounded-full"></span>
            <span>2m</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#f43f5e] rounded-full"></span>
            <span>4m</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#10b981] rounded-full"></span>
            <span>8m</span>
          </span>
          <span className="flex items-center gap-1.5 pl-2 border-l border-slate-700/80 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Mar 19 Fault (-33.4°C)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Mar 24 Extreme (46.1°C)</span>
          </span>
        </div>

        <button
          onClick={onOpenWorkspace}
          className="text-xs text-brand-400 hover:text-brand-300 hover:underline font-medium inline-flex items-center gap-1 self-end sm:self-auto"
        >
          <span>Humidity, Pressure & Forensics in Workspace</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
