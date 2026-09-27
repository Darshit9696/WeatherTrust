'use client';

import React from 'react';
import { Database, ShieldCheck, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-surface-border/60 bg-surface/90 py-8 px-6 mt-12 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="font-semibold text-white">WeatherTrust MVP</span>
          <span>— Explainable Multi-Height AWS Telemetry Quality Control</span>
        </div>

        <div className="text-center md:text-right text-[11px] text-slate-400 space-y-1">
          <div>
            <strong>Data Source:</strong> MOSDAC / ISRO Meteorological & Oceanographic Satellite Data Archival Centre.
          </div>
          <div className="text-slate-400">
            <strong>Analysis:</strong> 14-month historical station dataset. This prototype performs offline analysis of historical MOSDAC AWS telemetry.
          </div>
        </div>
      </div>
    </footer>
  );
};
