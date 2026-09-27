'use client';

import React from 'react';
import { StationMetadata, DatasetMetadata } from '@/lib/types';
import { Database, Calendar, MapPin, Compass } from 'lucide-react';

interface HeaderProps {
  station: StationMetadata;
  dataset: DatasetMetadata;
}

export const Header: React.FC<HeaderProps> = ({ station, dataset }) => {
  return (
    <header className="h-14 border-b border-surface-border bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Station Identification */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="font-semibold text-sm text-white">{station.station_name}</span>
          <span className="text-xs text-slate-400 font-mono">[{station.station_id}]</span>
        </div>
        <span className="hidden sm:inline text-slate-600">|</span>
        <span className="hidden sm:inline text-xs text-slate-400">
          {station.state}, {station.country}
        </span>
      </div>

      {/* Dataset & Contextual Metadata */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-300 font-mono">
            {dataset.start_time_ist.substring(0, 10)} → {dataset.end_time_ist.substring(0, 10)}
          </span>
        </div>

        <span className="hidden md:inline text-slate-700">|</span>

        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
            Historical Telemetry
          </span>
          <span className="text-[11px] text-slate-500">Source: MOSDAC / ISRO</span>
        </div>
      </div>
    </header>
  );
};
