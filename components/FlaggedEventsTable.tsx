'use client';

import React, { useState, useMemo } from 'react';
import { FlaggedEvent, SummaryStatistics } from '@/lib/types';
import {
  SENSOR_DISPLAY_NAMES,
  SENSOR_UNITS,
  getClassificationBadge,
  formatDisplayTime,
  getPrimaryEvidenceSummary,
} from '@/lib/data';
import {
  Filter,
  Search,
  ChevronRight,
  ShieldAlert,
  Flame,
  HelpCircle,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

interface FlaggedEventsTableProps {
  events: FlaggedEvent[];
  summaryStats?: SummaryStatistics;
  onSelectEvent: (event: FlaggedEvent) => void;
}

export const FlaggedEventsTable: React.FC<FlaggedEventsTableProps> = ({
  events,
  summaryStats,
  onSelectEvent,
}) => {
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSensor, setFilterSensor] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 25;

  // Extract unique sensors present across events
  const uniqueSensors = useMemo(() => {
    const sSet = new Set<string>();
    events.forEach((e) => sSet.add(e.sensor));
    return Array.from(sSet);
  }, [events]);

  // Compute breakdown counts
  const counts = useMemo(() => {
    let faults = 0;
    let extremes = 0;
    let uncertain = 0;
    events.forEach((e) => {
      if (e.classification === 'PROBABLE_SENSOR_FAULT') faults++;
      else if (e.classification === 'POSSIBLE_WEATHER_EXTREME') extremes++;
      else if (e.classification === 'UNCERTAIN') uncertain++;
    });

    return {
      faults: summaryStats ? summaryStats.classification_breakdown.PROBABLE_SENSOR_FAULT : faults,
      extremes: summaryStats ? summaryStats.classification_breakdown.POSSIBLE_WEATHER_EXTREME : extremes,
      uncertain: summaryStats ? summaryStats.classification_breakdown.UNCERTAIN : uncertain,
    };
  }, [events, summaryStats]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterClass !== 'ALL' && ev.classification !== filterClass) return false;
      if (filterSensor !== 'ALL' && ev.sensor !== filterSensor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTs = ev.timestamp.toLowerCase().includes(q);
        const matchSensor = (SENSOR_DISPLAY_NAMES[ev.sensor] || ev.sensor).toLowerCase().includes(q);
        const matchVal = ev.raw_value.toLowerCase().includes(q);
        const matchEvidence = getPrimaryEvidenceSummary(ev).toLowerCase().includes(q);
        if (!matchTs && !matchSensor && !matchVal && !matchEvidence) return false;
      }
      return true;
    });
  }, [events, filterClass, filterSensor, searchQuery]);

  // Reset pagination when filters change
  const handleFilterClassChange = (cls: string) => {
    setFilterClass(cls);
    setCurrentPage(1);
  };

  const handleFilterSensorChange = (s: string) => {
    setFilterSensor(s);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  // Paginated subset
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / rowsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredEvents.slice(start, start + rowsPerPage);
  }, [filteredEvents, currentPage]);

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-6 shadow-xl space-y-5">
      {/* 1. Header with Compact Summary Counters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-surface-border/80">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Events & Alerts</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Investigate telemetry anomalies and the evidence behind each classification.
          </p>
        </div>

        {/* Compact Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-rose-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-400 font-medium">Probable Sensor Faults:</span>
            <span className="text-xs font-bold text-rose-300 font-mono">{counts.faults.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] text-slate-400 font-medium">Possible Weather Extremes:</span>
            <span className="text-xs font-bold text-amber-300 font-mono">{counts.extremes.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span className="text-[11px] text-slate-400 font-medium">Uncertain Warnings:</span>
            <span className="text-xs font-bold text-sky-300 font-mono">{counts.uncertain.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Classification Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <button
            onClick={() => handleFilterClassChange('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterClass === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({events.length.toLocaleString()})
          </button>
          <button
            onClick={() => handleFilterClassChange('PROBABLE_SENSOR_FAULT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterClass === 'PROBABLE_SENSOR_FAULT'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-rose-300'
            }`}
          >
            Probable Fault ({counts.faults})
          </button>
          <button
            onClick={() => handleFilterClassChange('POSSIBLE_WEATHER_EXTREME')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterClass === 'POSSIBLE_WEATHER_EXTREME'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            Possible Extreme ({counts.extremes})
          </button>
          <button
            onClick={() => handleFilterClassChange('UNCERTAIN')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterClass === 'UNCERTAIN'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-sky-300'
            }`}
          >
            Uncertain ({counts.uncertain.toLocaleString()})
          </button>
        </div>

        {/* Sensor Dropdown & Search Input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sensor Dropdown */}
          <select
            value={filterSensor}
            onChange={(e) => handleFilterSensorChange(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="ALL">All Sensors (10 Monitored)</option>
            {uniqueSensors.map((s) => (
              <option key={s} value={s}>
                {SENSOR_DISPLAY_NAMES[s] || s}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search date, sensor, value..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-48 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. Event Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border bg-slate-950/60 shadow-inner">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4 whitespace-nowrap">Time (IST)</th>
              <th className="py-3 px-4 whitespace-nowrap">Sensor</th>
              <th className="py-3 px-4 whitespace-nowrap">Reading</th>
              <th className="py-3 px-4 whitespace-nowrap">Classification</th>
              <th className="py-3 px-4 whitespace-nowrap">Confidence</th>
              <th className="py-3 px-4 whitespace-nowrap">Health</th>
              <th className="py-3 px-4">Primary Evidence</th>
              <th className="py-3 px-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {paginatedEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  No events found matching the active filter criteria.
                </td>
              </tr>
            ) : (
              paginatedEvents.map((ev, idx) => {
                const badge = getClassificationBadge(ev.classification);
                const unit = SENSOR_UNITS[ev.sensor] || '';
                const primaryEvidence = getPrimaryEvidenceSummary(ev);

                return (
                  <tr
                    key={`${ev.timestamp}-${ev.sensor}-${idx}`}
                    onClick={() => onSelectEvent(ev)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {/* TIME (IST) */}
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {formatDisplayTime(ev.timestamp)}
                    </td>

                    {/* SENSOR */}
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      {SENSOR_DISPLAY_NAMES[ev.sensor] || ev.sensor}
                    </td>

                    {/* READING */}
                    <td className="py-3 px-4 font-bold text-white font-mono whitespace-nowrap">
                      {ev.raw_value} {unit}
                    </td>

                    {/* CLASSIFICATION */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1.5 ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        {badge.label}
                      </span>
                    </td>

                    {/* CONFIDENCE */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-300 whitespace-nowrap">
                      {(ev.confidence * 100).toFixed(0)}%
                    </td>

                    {/* HEALTH */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span
                        className={
                          ev.health_score < 70
                            ? 'text-rose-400 font-bold'
                            : ev.health_score < 90
                            ? 'text-amber-400 font-bold'
                            : 'text-emerald-400 font-bold'
                        }
                      >
                        {Math.round(ev.health_score)}
                      </span>
                    </td>

                    {/* PRIMARY EVIDENCE */}
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate" title={primaryEvidence}>
                      {primaryEvidence}
                    </td>

                    {/* ACTION CHEVRON */}
                    <td className="py-3 px-3 text-right text-slate-500 group-hover:text-brand-400 transition-colors">
                      <ChevronRight className="w-4 h-4 inline" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredEvents.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div>
            Showing{' '}
            <strong className="text-white font-mono">
              {((currentPage - 1) * rowsPerPage + 1).toLocaleString()}
            </strong>{' '}
            to{' '}
            <strong className="text-white font-mono">
              {Math.min(currentPage * rowsPerPage, filteredEvents.length).toLocaleString()}
            </strong>{' '}
            of{' '}
            <strong className="text-white font-mono">
              {filteredEvents.length.toLocaleString()}
            </strong>{' '}
            events
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-mono text-[11px]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
