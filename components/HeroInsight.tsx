'use client';

import React from 'react';
import { FlaggedEvent } from '@/lib/types';
import { CheckCircle2, XCircle, ArrowRight, ShieldAlert, Sun, Cpu } from 'lucide-react';

interface HeroInsightProps {
  extremeEvent?: FlaggedEvent;
  faultEvent?: FlaggedEvent;
}

export const HeroInsight: React.FC<HeroInsightProps> = ({ extremeEvent, faultEvent }) => {
  return (
    <div className="bg-gradient-to-b from-surface-elevated/90 to-surface/90 border border-surface-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider border border-brand-500/30">
              Core Algorithmic Distinction
            </span>
            <span className="text-slate-400 text-xs font-mono">Multi-Sensor Evidence Fusion</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Extreme Weather <span className="text-brand-400">≠</span> Sensor Failure
          </h2>
        </div>
        <div className="text-xs text-slate-400 max-w-sm">
          A high or low reading alone never declares sensor failure. WeatherTrust verifies spatial consensus across colocated towers and temporal continuity before classifying.
        </div>
      </div>

      {/* Side-by-side comparison grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: METEOROLOGICALLY CONSISTENT EXTREME */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                METEOROLOGICALLY CONSISTENT EXTREME
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {extremeEvent ? extremeEvent.timestamp : '2016-03-24 14:00 IST'}
              </span>
            </div>

            <div className="my-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2 font-medium">Colocated Tower Readings:</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">2m Temp</div>
                  <div className="text-sm font-bold text-white mt-0.5">41.75°C</div>
                </div>
                <div className="p-2 rounded bg-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">4m Temp</div>
                  <div className="text-sm font-bold text-white mt-0.5">40.40°C</div>
                </div>
                <div className="p-2 rounded bg-amber-500/20 border border-amber-500/40">
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">8m Temp</div>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">
                    {extremeEvent?.numeric_value ? `${extremeEvent.numeric_value.toFixed(2)}°C` : '46.10°C'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Multi-height agreement:</strong> 2m, 4m, and 8m towers all confirm intense summer surface heating.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span><strong>Smooth progression:</strong> Consecutive 30-min changes remain within natural meteorological rates (+0.75°C/step).</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/20">
            <p className="text-xs text-amber-200/90 italic font-medium">
              &quot;Multiple colocated sensors agree and temperature changes smoothly. WeatherTrust preserves this observation instead of rejecting it as a fault.&quot;
            </p>
          </div>
        </div>

        {/* RIGHT: PROBABLE SENSOR FAULT */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                PROBABLE SENSOR FAULT
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {faultEvent ? faultEvent.timestamp : '2016-03-19 11:30 IST'}
              </span>
            </div>

            <div className="my-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 mb-2 font-medium">Colocated Tower Readings:</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">2m Temp</div>
                  <div className="text-sm font-bold text-white mt-0.5">35.15°C</div>
                </div>
                <div className="p-2 rounded bg-rose-500/20 border border-rose-500/40">
                  <div className="text-[10px] text-rose-300 uppercase font-semibold">4m Temp</div>
                  <div className="text-sm font-bold text-rose-300 mt-0.5">
                    {faultEvent?.raw_value ? `${faultEvent.raw_value}°C` : '-33.4°C'}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">8m Temp</div>
                  <div className="text-sm font-bold text-white mt-0.5">36.85°C</div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span><strong>Cross-sensor divergence:</strong> 4m sensor disagrees by <strong>69.4°C</strong> from 2m and 8m consensus (spread 1.7°C).</span>
              </div>
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span><strong>Violent transient jump & rebound:</strong> Plunged by <strong>-65.4°C</strong> and recovered by <strong>+68.1°C</strong> in 30 mins (net diff: 2.7°C).</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between gap-3">
            <p className="text-xs text-rose-200/90 italic font-medium">
              &quot;The 4m sensor abruptly diverged from two colocated sensors and immediately recovered, indicating sensor malfunction rather than real weather.&quot;
            </p>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 whitespace-nowrap">
              Conf: {faultEvent?.confidence ? `${(faultEvent.confidence * 100).toFixed(0)}%` : '99%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
