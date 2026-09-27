'use client';

import React, { useState, useMemo } from 'react';
import { DashboardTimeSeriesPoint, FlaggedEvent } from '@/lib/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot,
  ReferenceArea,
} from 'recharts';
import {
  LineChart as ChartIcon,
  ZoomIn,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  AlertTriangle,
  Flame,
  Zap,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface TimeSeriesExplorerProps {
  data: DashboardTimeSeriesPoint[];
  topAnomalies?: FlaggedEvent[];
  onSelectEvent?: (event: FlaggedEvent) => void;
}

type Mode = 'temperature' | 'humidity' | 'pressure' | 'wind' | 'battery';

export const TimeSeriesExplorer: React.FC<TimeSeriesExplorerProps> = ({
  data,
  topAnomalies = [],
  onSelectEvent,
}) => {
  const [mode, setMode] = useState<Mode>('temperature');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Filter dataset by preset or seasonal range window
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (dateFilter === 'all') return data;

    // Incident Presets
    if (dateFilter === 'march_spike') {
      return data.filter(
        (d) =>
          d.timestamp.startsWith('2016-03-18') ||
          d.timestamp.startsWith('2016-03-19') ||
          d.timestamp.startsWith('2016-03-20')
      );
    }
    if (dateFilter === 'may_heatwave') {
      return data.filter(
        (d) =>
          d.timestamp.startsWith('2016-03-23') ||
          d.timestamp.startsWith('2016-03-24') ||
          d.timestamp.startsWith('2016-03-25')
      );
    }
    if (dateFilter === 'sept_failure') {
      return data.filter(
        (d) =>
          d.timestamp.startsWith('2016-09-20') ||
          d.timestamp.startsWith('2016-09-21') ||
          d.timestamp.startsWith('2016-09-22')
      );
    }

    // Seasonal / Quarterly Range Filters
    if (dateFilter === 'q1_2016') {
      return data.filter((d) => d.timestamp >= '2016-01-01' && d.timestamp <= '2016-03-31');
    }
    if (dateFilter === 'summer_2016') {
      return data.filter((d) => d.timestamp >= '2016-04-01' && d.timestamp <= '2016-06-30');
    }
    if (dateFilter === 'monsoon_2016') {
      return data.filter((d) => d.timestamp >= '2016-07-01' && d.timestamp <= '2016-09-30');
    }
    if (dateFilter === 'winter_2016_17') {
      return data.filter((d) => d.timestamp >= '2016-10-01' && d.timestamp <= '2017-03-02');
    }

    return data;
  }, [data, dateFilter]);

  // Downsample if viewing 'all' or large range to maintain high performance
  const chartData = useMemo(() => {
    if (filteredData.length <= 1500) return filteredData;
    const step = Math.ceil(filteredData.length / 1500);
    return filteredData.filter((_, idx) => idx % step === 0 || _.is_flagged);
  }, [filteredData]);

  // Compute live viewport telemetry statistics
  const viewportStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, flaggedCount: 0 };
    }

    let values: number[] = [];
    if (mode === 'temperature') {
      values = filteredData
        .map((d) => d.temp_4m)
        .filter((v): v is number => v !== null && !isNaN(v));
    } else if (mode === 'humidity') {
      values = filteredData
        .map((d) => d.rh_2m)
        .filter((v): v is number => v !== null && !isNaN(v));
    } else if (mode === 'pressure') {
      values = filteredData
        .map((d) => d.pressure)
        .filter((v): v is number => v !== null && !isNaN(v));
    } else if (mode === 'wind') {
      values = filteredData
        .map((d) => d.wind_speed_10m)
        .filter((v): v is number => v !== null && !isNaN(v));
    } else if (mode === 'battery') {
      values = filteredData
        .map((d) => d.battery_voltage)
        .filter((v): v is number => v !== null && !isNaN(v));
    }

    const flaggedCount = filteredData.filter((d) => d.is_flagged).length;

    if (values.length === 0) {
      return { count: filteredData.length, min: 0, max: 0, avg: 0, flaggedCount };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((acc, v) => acc + v, 0) / values.length;

    return {
      count: filteredData.length,
      min,
      max,
      avg,
      flaggedCount,
    };
  }, [filteredData, mode]);

  // Incident Ribbon matched event details
  const activeIncident = useMemo(() => {
    if (dateFilter === 'march_spike') {
      const ev = topAnomalies.find(
        (a) => a.timestamp.startsWith('2016-03-19 11:30') && a.sensor === 'temp_4m'
      );
      return {
        event: ev,
        title: 'Incident Focus: 2016-03-19 11:30 IST — temp_4m Severe Negative Spike (-33.4°C)',
        classification: 'PROBABLE_SENSOR_FAULT' as const,
        confidence: 1.0,
        summary:
          'temp_4m experienced an isolated -69.7°C step jump down to -33.4°C while colocated 2m (36.3°C) and 8m (35.6°C) sensors remained normal. Symmetrical rebound at 12:00 IST confirmed an isolated hardware glitch.',
      };
    }
    if (dateFilter === 'may_heatwave') {
      const ev = topAnomalies.find(
        (a) => a.timestamp.startsWith('2016-03-24 14:00') && a.sensor === 'temp_8m'
      );
      return {
        event: ev,
        title: 'Incident Focus: 2016-03-24 14:00 IST — Meteorological Extreme (46.1°C)',
        classification: 'POSSIBLE_WEATHER_EXTREME' as const,
        confidence: 0.9,
        summary:
          'All three vertical heights agreed within 1.1°C (2m: 45.3°C, 4m: 45.6°C, 8m: 46.1°C). Diurnal progression was smooth with realistic lapse profile. Validated as meteorologically consistent extreme.',
      };
    }
    if (dateFilter === 'sept_failure') {
      const ev = topAnomalies.find(
        (a) => a.timestamp.startsWith('2016-09-21 02:00') && a.sensor === 'pressure'
      );
      return {
        event: ev,
        title: 'Incident Focus: 2016-09-21 02:00 IST — Atmospheric Pressure Outage (0.0 mbar)',
        classification: 'PROBABLE_SENSOR_FAULT' as const,
        confidence: 0.96,
        summary:
          'Pressure transducer dropped to exactly 0.0 mbar during primary DC power collapse (battery voltage collapsed to 0V / 10.9V). Hardware power outage, not physical vacuum.',
      };
    }
    return null;
  }, [dateFilter, topAnomalies]);

  // Click on point handler
  const handleChartClick = (e: any) => {
    if (!e || !e.activePayload || !e.activePayload.length || !onSelectEvent) return;
    const clickedPoint = e.activePayload[0]?.payload as DashboardTimeSeriesPoint;
    if (!clickedPoint) return;

    // Look for a corresponding flagged event
    const matched = topAnomalies.find(
      (a) => a.timestamp === clickedPoint.timestamp || a.timestamp.startsWith(clickedPoint.timestamp.substring(0, 16))
    );
    if (matched) {
      onSelectEvent(matched);
    }
  };

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-6 shadow-xl space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <ChartIcon className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Station Telemetry & Investigation Workspace
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Interactive Diagnostics
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deep-dive multi-sensor time-series workspace. Switch parameters, filter seasonal ranges, zoom to key incidents, and inspect forensic anomalies.
          </p>
        </div>

        {/* Parameter Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <button
            onClick={() => setMode('temperature')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'temperature'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Temperature (2m, 4m, 8m)</span>
          </button>
          <button
            onClick={() => setMode('humidity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'humidity'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Humidity (2m)</span>
          </button>
          <button
            onClick={() => setMode('pressure')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'pressure'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Pressure</span>
          </button>
          <button
            onClick={() => setMode('wind')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'wind'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Wind (10m)</span>
          </button>
          <button
            onClick={() => setMode('battery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              mode === 'battery'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Battery (12V)</span>
          </button>
        </div>
      </div>

      {/* Secondary Controls Bar: Incident Presets & Seasonal Zoom Ranges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Incident Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mr-1">
            <ZoomIn className="w-3 h-3 text-brand-400" />
            <span>Incident Presets:</span>
          </span>
          <button
            onClick={() => {
              setDateFilter('march_spike');
              setMode('temperature');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              dateFilter === 'march_spike'
                ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Mar 19 (-33.4°C Spike)
          </button>
          <button
            onClick={() => {
              setDateFilter('may_heatwave');
              setMode('temperature');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              dateFilter === 'may_heatwave'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/60 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Mar 24 Extreme (46.1°C)
          </button>
          <button
            onClick={() => {
              setDateFilter('sept_failure');
              setMode('pressure');
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              dateFilter === 'sept_failure'
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/60 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Sep 21 (0 mbar Outage)
          </button>
        </div>

        {/* Seasonal / Range Zoom Presets */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3 h-3 text-sky-400" />
            <span>Range:</span>
          </span>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              dateFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Full (14 Mo)
          </button>
          <button
            onClick={() => setDateFilter('q1_2016')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              dateFilter === 'q1_2016'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Q1 2016
          </button>
          <button
            onClick={() => setDateFilter('summer_2016')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              dateFilter === 'summer_2016'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Summer &apos;16
          </button>
          <button
            onClick={() => setDateFilter('monsoon_2016')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              dateFilter === 'monsoon_2016'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Monsoon &apos;16
          </button>
          <button
            onClick={() => setDateFilter('winter_2016_17')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              dateFilter === 'winter_2016_17'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900/70 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Winter &apos;16-17
          </button>
        </div>
      </div>

      {/* Incident Forensic Callout Ribbon (Shown when an incident preset is active) */}
      {activeIncident && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            activeIncident.classification === 'PROBABLE_SENSOR_FAULT'
              ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
              : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  activeIncident.classification === 'PROBABLE_SENSOR_FAULT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {activeIncident.classification.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-bold text-white tracking-wide">
                {activeIncident.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Confidence: {(activeIncident.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-4xl">{activeIncident.summary}</p>
          </div>

          {activeIncident.event && onSelectEvent && (
            <button
              onClick={() => onSelectEvent(activeIncident.event!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold border border-slate-700 hover:border-slate-500 shadow transition-all whitespace-nowrap self-start md:self-auto"
            >
              <span>Inspect Forensic Evidence in Drawer</span>
              <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
            </button>
          )}
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-96 w-full cursor-crosshair">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
            onClick={handleChartClick}
          >
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
              domain={
                mode === 'temperature'
                  ? [-45, 52]
                  : mode === 'pressure'
                  ? [0, 1030]
                  : mode === 'humidity'
                  ? [0, 105]
                  : mode === 'wind'
                  ? [0, 30]
                  : [0, 15]
              }
              unit={
                mode === 'temperature'
                  ? '°C'
                  : mode === 'pressure'
                  ? 'mb'
                  : mode === 'humidity'
                  ? '%'
                  : mode === 'wind'
                  ? 'm/s'
                  : 'V'
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload as DashboardTimeSeriesPoint;
                if (!d) return null;

                // Real-time temperature gradient calculation
                let tempDeviation: number | null = null;
                if (
                  d.temp_2m !== null &&
                  d.temp_4m !== null &&
                  d.temp_8m !== null &&
                  !isNaN(d.temp_2m) &&
                  !isNaN(d.temp_4m) &&
                  !isNaN(d.temp_8m)
                ) {
                  const maxT = Math.max(d.temp_2m, d.temp_4m, d.temp_8m);
                  const minT = Math.min(d.temp_2m, d.temp_4m, d.temp_8m);
                  tempDeviation = maxT - minT;
                }

                return (
                  <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs min-w-[240px] backdrop-blur-md">
                    <div className="text-[11px] text-slate-400 font-mono mb-2 border-b border-slate-800 pb-1.5 flex justify-between items-center">
                      <span>{label} IST</span>
                      {d.is_flagged && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/40">
                          FLAGGED ANOMALY
                        </span>
                      )}
                    </div>

                    {mode === 'temperature' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-sky-400 font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#38bdf8]"></span>
                            <span>2m Air Temp:</span>
                          </span>
                          <span className="font-bold">{d.temp_2m !== null ? `${d.temp_2m.toFixed(2)} °C` : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-400 font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#f43f5e]"></span>
                            <span>4m Air Temp:</span>
                          </span>
                          <span className="font-bold">{d.temp_4m !== null ? `${d.temp_4m.toFixed(2)} °C` : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-400 font-mono">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                            <span>8m Air Temp:</span>
                          </span>
                          <span className="font-bold">{d.temp_8m !== null ? `${d.temp_8m.toFixed(2)} °C` : '—'}</span>
                        </div>

                        {tempDeviation !== null && (
                          <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400">Vertical Tower Spread:</span>
                            <span
                              className={`font-mono font-bold ${
                                tempDeviation > 10
                                  ? 'text-rose-400'
                                  : tempDeviation > 3
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              Δ {tempDeviation.toFixed(2)} °C
                              {tempDeviation > 10
                                ? ' (Severe Contradiction)'
                                : tempDeviation <= 1.5
                                ? ' (Consensus)'
                                : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {mode === 'pressure' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-purple-400 font-mono">
                          <span>Atmospheric Pressure:</span>
                          <span className="font-bold">{d.pressure !== null ? `${d.pressure.toFixed(1)} mbar` : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-400 font-mono text-[11px]">
                          <span>Battery Bus Voltage:</span>
                          <span className="font-bold">{d.battery_voltage !== null ? `${d.battery_voltage.toFixed(2)} V` : '—'}</span>
                        </div>
                        {d.pressure === 0 && (
                          <div className="pt-1 mt-1 text-[10px] text-rose-400 font-bold">
                            ⚠️ Sensor Outage / Transducer 0.0 mbar Flatline
                          </div>
                        )}
                      </div>
                    )}

                    {mode === 'humidity' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-cyan-400 font-mono">
                          <span>Relative Humidity (2m):</span>
                          <span className="font-bold">{d.rh_2m !== null ? `${d.rh_2m.toFixed(1)} %` : '—'}</span>
                        </div>
                      </div>
                    )}

                    {mode === 'wind' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-emerald-400 font-mono">
                          <span>Wind Speed (10m):</span>
                          <span className="font-bold">{d.wind_speed_10m !== null ? `${d.wind_speed_10m.toFixed(2)} m/s` : '—'}</span>
                        </div>
                      </div>
                    )}

                    {mode === 'battery' && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-amber-400 font-mono">
                          <span>DC Battery Bus:</span>
                          <span className="font-bold">{d.battery_voltage !== null ? `${d.battery_voltage.toFixed(2)} V` : '—'}</span>
                        </div>
                        {d.battery_voltage !== null && d.battery_voltage < 11.5 && (
                          <div className="text-[10px] text-rose-400 font-bold">
                            ⚠️ Low Supply Voltage (&lt;11.5V)
                          </div>
                        )}
                      </div>
                    )}

                    {d.is_flagged && (
                      <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 italic">
                        Tip: Click anomaly to inspect forensic evidence
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />

            {mode === 'temperature' && (
              <>
                <Line
                  type="monotone"
                  dataKey="temp_2m"
                  name="Air Temp @ 2m"
                  stroke="#38bdf8"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="temp_4m"
                  name="Air Temp @ 4m"
                  stroke="#f43f5e"
                  dot={false}
                  strokeWidth={1.75}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="temp_8m"
                  name="Air Temp @ 8m"
                  stroke="#10b981"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
                {/* Specific landmark reference dots */}
                <ReferenceDot
                  x="2016-03-19 11:30:00"
                  y={-33.4}
                  r={6}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <ReferenceDot
                  x="2016-03-24 14:00:00"
                  y={46.1}
                  r={6}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}

            {mode === 'humidity' && (
              <Line
                type="monotone"
                dataKey="rh_2m"
                name="Relative Humidity @ 2m"
                stroke="#06b6d4"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}

            {mode === 'pressure' && (
              <>
                <Line
                  type="monotone"
                  dataKey="pressure"
                  name="Atmospheric Pressure (mbar)"
                  stroke="#8b5cf6"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
                <ReferenceDot
                  x="2016-09-21 02:00:00"
                  y={0.0}
                  r={6}
                  fill="#8b5cf6"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </>
            )}

            {mode === 'wind' && (
              <Line
                type="monotone"
                dataKey="wind_speed_10m"
                name="Wind Speed @ 10m (m/s)"
                stroke="#10b981"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}

            {mode === 'battery' && (
              <Line
                type="monotone"
                dataKey="battery_voltage"
                name="Station Battery Voltage (V)"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Viewport Statistics & Metadata Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Viewport Window:</span>
            <span className="font-mono text-white font-semibold">{viewportStats.count.toLocaleString()} steps</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Range [Min / Max]:</span>
            <span className="font-mono text-white font-semibold">
              [{viewportStats.min.toFixed(1)} / {viewportStats.max.toFixed(1)}]
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Mean:</span>
            <span className="font-mono text-white font-semibold">{viewportStats.avg.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Flagged in View:</span>
            <span
              className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                viewportStats.flaggedCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-300'
              }`}
            >
              {viewportStats.flaggedCount} anomalies
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Click any anomalous step to launch deep-dive forensic investigation drawer</span>
        </div>
      </div>
    </div>
  );
};
