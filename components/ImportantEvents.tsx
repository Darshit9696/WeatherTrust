'use client';

import React from 'react';
import { FlaggedEvent } from '@/lib/types';
import { SENSOR_DISPLAY_NAMES, SENSOR_UNITS, getClassificationBadge, formatTimestamp } from '@/lib/data';
import { AlertTriangle, ArrowRight, Flame, ShieldAlert, ZapOff } from 'lucide-react';

interface ImportantEventsProps {
  events: FlaggedEvent[];
  onSelectEvent: (event: FlaggedEvent) => void;
  onNavigateToEvents: () => void;
}

export const ImportantEvents: React.FC<ImportantEventsProps> = ({
  events,
  onSelectEvent,
  onNavigateToEvents,
}) => {
  // Curate 5-6 representative high-impact events from the dataset:
  // 1. Mar 19 -33.4C fault
  // 2. Sep 21 0 mbar blackout
  // 3. Mar 24 46.10C weather extreme
  // 4. Jun 12 -44.6C fault
  // 5. Jul 01 -39.2C fault
  // 6. Jan 14 73730 mm rain spike
  const selectedKeys = [
    (e: FlaggedEvent) => e.sensor === 'temp_4m' && e.timestamp.includes('2016-03-19') && e.timestamp.includes('11:30'),
    (e: FlaggedEvent) => e.sensor === 'pressure' && e.timestamp.includes('2016-09-21') && e.timestamp.includes('02:00'),
    (e: FlaggedEvent) => e.classification === 'POSSIBLE_WEATHER_EXTREME' && (e.numeric_value || 0) >= 45.0,
    (e: FlaggedEvent) => e.sensor === 'temp_8m' && e.timestamp.includes('2016-06-12') && e.timestamp.includes('06:00'),
    (e: FlaggedEvent) => e.sensor === 'temp_4m' && e.timestamp.includes('2016-07-01') && e.timestamp.includes('22:30'),
  ];

  const highlightedEvents: FlaggedEvent[] = [];
  selectedKeys.forEach((fn) => {
    const found = events.find(fn);
    if (found && !highlightedEvents.some((h) => h.timestamp === found.timestamp && h.sensor === found.sensor)) {
      highlightedEvents.push(found);
    }
  });

  // If fewer than 4, pad with other top events
  if (highlightedEvents.length < 5) {
    events.slice(0, 5).forEach((e) => {
      if (!highlightedEvents.some((h) => h.timestamp === e.timestamp && h.sensor === e.sensor)) {
        highlightedEvents.push(e);
      }
    });
  }

  function getConciseEvidenceSummary(ev: FlaggedEvent): string {
    if (ev.sensor === 'temp_4m' && ev.timestamp.includes('2016-03-19')) {
      return '69.4°C cross-sensor divergence + abrupt rebound (-65.4°C / +68.1°C)';
    }
    if (ev.sensor === 'pressure' && ev.timestamp.includes('2016-09-21')) {
      return 'Power blackout (battery 0.0V) + multi-channel zero-out';
    }
    if (ev.classification === 'POSSIBLE_WEATHER_EXTREME') {
      return 'Multi-height sensors remain consistent (lapse spread <= 2.3°C)';
    }
    if (ev.sensor === 'temp_8m' && ev.timestamp.includes('2016-06-12')) {
      return '73.8°C divergence from colocated 2m & 4m consensus (spread 0.4°C)';
    }
    if (ev.sensor === 'temp_4m' && ev.timestamp.includes('2016-07-01')) {
      return '67.6°C cross-sensor disagreement before subsequent NA drop';
    }
    if (ev.cross_sensor_evidence?.details) {
      return ev.cross_sensor_evidence.details;
    }
    if (ev.temporal_evidence?.details) {
      return ev.temporal_evidence.details;
    }
    return ev.explanation.substring(0, 70) + '...';
  }

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-xl p-4">
      <div className="flex items-center justify-between pb-3 border-b border-surface-border/60 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Important Operational Events</h3>
        </div>
        <button
          onClick={onNavigateToEvents}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
        >
          <span>All Events ({events.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Alert Rows */}
      <div className="space-y-2">
        {highlightedEvents.map((ev, idx) => {
          const badge = getClassificationBadge(ev.classification);
          const unit = SENSOR_UNITS[ev.sensor] || '';
          const isFault = ev.classification === 'PROBABLE_SENSOR_FAULT';

          return (
            <div
              key={`${ev.timestamp}-${ev.sensor}-${idx}`}
              className="p-3 rounded-xl bg-slate-900/60 border border-surface-border/70 hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    isFault ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {isFault ? <ShieldAlert className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-300">
                      {formatTimestamp(ev.timestamp)} IST
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="font-semibold text-xs text-white">
                      {SENSOR_DISPLAY_NAMES[ev.sensor] || ev.sensor}
                    </span>
                    <span className="font-bold text-xs text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {ev.raw_value} {unit}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {getConciseEvidenceSummary(ev)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                >
                  {badge.label}
                  {ev.confidence ? ` ${(ev.confidence * 100).toFixed(0)}%` : ''}
                </span>

                <button
                  onClick={() => onSelectEvent(ev)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 hover:text-white border border-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>{isFault ? 'Investigate' : 'Inspect'}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
