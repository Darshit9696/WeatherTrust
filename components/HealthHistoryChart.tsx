'use client';

import React, { useState } from 'react';
import { HealthHistoryPoint } from '@/lib/types';
import { SENSOR_DISPLAY_NAMES } from '@/lib/data';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, ShieldAlert, Sparkles } from 'lucide-react';

interface HealthHistoryChartProps {
  healthHistory: Record<string, HealthHistoryPoint[]>;
}

export const HealthHistoryChart: React.FC<HealthHistoryChartProps> = ({ healthHistory }) => {
  const [selectedSensor, setSelectedSensor] = useState<string>('temp_4m');

  const history = healthHistory[selectedSensor] || [];

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Dynamic Sensor Trust Trajectory
          </h3>
          <p className="text-xs text-slate-400">
            Sequential health score (0-100) across time: drops immediately upon fault detection and recovers gradually during verified healthy observations.
          </p>
        </div>

        {/* Sensor selector tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 rounded-lg p-1 border border-slate-800 text-xs">
          {['temp_4m', 'pressure', 'battery_voltage', 'temp_8m'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSensor(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedSensor === s
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {SENSOR_DISPLAY_NAMES[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timestamp"
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(ts) => (ts ? ts.substring(0, 10) : '')}
              minTickGap={40}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              domain={[0, 105]}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#f8fafc',
              }}
              formatter={(val: any) => [`${val}%`, 'Trust Score']}
              labelFormatter={(lbl) => `Time: ${lbl} IST`}
            />
            <Area
              type="monotone"
              dataKey="health"
              stroke="#818cf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#healthGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Noticeable dips reflect confirmed fault events (-30 to -35 pts) followed by steady linear recovery (+0.5 pts/step).</span>
        </span>
        <span className="font-mono text-slate-500">History points: {history.length}</span>
      </div>
    </div>
  );
};
