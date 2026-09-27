'use client';

import React from 'react';
import { FlaggedEvent } from '@/lib/types';
import { ZapOff, AlertOctagon, Activity, BatteryLow } from 'lucide-react';

interface CorrelatedFailureCardProps {
  events?: FlaggedEvent[];
}

export const CorrelatedFailureCard: React.FC<CorrelatedFailureCardProps> = ({ events }) => {
  return (
    <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-rose-950/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-rose-500/30 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
            <ZapOff className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-500/40">
                Correlated System Failure
              </span>
              <span className="text-xs text-slate-400 font-mono">2016-09-21 02:00 - 06:00 IST</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Power Blackout & Transducer Bus Zero-Out
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-xs text-rose-300 font-medium">
            Isolation Forest Anomaly Score: <strong>1.000</strong> (Max Extent)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Atm. Pressure</span>
            <span className="text-rose-400 font-bold">SENTINEL</span>
          </div>
          <div className="text-xl font-bold text-rose-400">0.0 mbar</div>
          <div className="text-[11px] text-slate-400 mt-1">Normal: 980 - 1015 mbar (dropped from 999.8 mbar)</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Battery Voltage</span>
            <span className="text-rose-400 font-bold">POWER LOSS</span>
          </div>
          <div className="text-xl font-bold text-rose-400">0.0 V</div>
          <div className="text-[11px] text-slate-400 mt-1">Normal: 12.0 - 14.5 V (complete logger brownout)</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Multi-Height Temp</span>
            <span className="text-rose-400 font-bold">ADC COLLAPSE</span>
          </div>
          <div className="text-xl font-bold text-rose-400">0.0 / 0.0 / 0.0 °C</div>
          <div className="text-[11px] text-slate-400 mt-1">Simultaneous channel zero-out at 05:30 IST</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Recovery</span>
            <span className="text-emerald-400 font-bold">SOLAR RECHARGE</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">1001.0 mbar</div>
          <div className="text-[11px] text-slate-400 mt-1">Normal operation resumed at 09:30 IST (13.4V)</div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200/90 leading-relaxed">
        <strong>Diagnostic Summary:</strong> Multiple unrelated channels failed simultaneously while battery voltage fell to zero, indicating station/power failure rather than a meteorological event. WeatherTrust correlates power telemetry with physical transducers to confirm electrical blackout.
      </div>
    </div>
  );
};
