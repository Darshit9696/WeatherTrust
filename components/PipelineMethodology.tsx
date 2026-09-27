'use client';

import React from 'react';
import { ArrowRight, CheckSquare, Clock, Cpu, GitMerge, Shield, Zap } from 'lucide-react';

export const PipelineMethodology: React.FC = () => {
  const steps = [
    {
      title: 'Observation',
      desc: '30-min MOSDAC AWS telemetry stream',
      icon: <Clock className="w-4 h-4 text-cyan-400" />,
    },
    {
      title: 'Rule QC',
      desc: 'Physical bounds & sentinel detection',
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
    },
    {
      title: 'Temporal Checks',
      desc: 'Rate-of-change & isolated spike rebound',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
    {
      title: 'Colocated Consensus',
      desc: 'Multi-height (2m, 4m, 8m) consensus',
      icon: <GitMerge className="w-4 h-4 text-indigo-400" />,
    },
    {
      title: 'Isolation Forest',
      desc: 'Unsupervised multivariate outlier score',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
    },
    {
      title: 'Evidence Fusion',
      desc: 'Multi-signal corroboration engine',
      icon: <Shield className="w-4 h-4 text-rose-400" />,
    },
    {
      title: 'Classification',
      desc: 'Fault vs Extreme vs Uncertain',
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
    },
  ];

  return (
    <div className="bg-surface-elevated/40 border border-surface-border rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-brand-400" />
          How WeatherTrust Decides
        </h3>
        <p className="text-xs text-slate-400">
          Eight-stage explainable pipeline fusing deterministic physical rules, colocated consensus, and machine learning.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((step, idx) => (
          <div
            key={step.title}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between text-center relative group hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-center mx-auto w-8 h-8 rounded-lg bg-slate-800/80 mb-2">
              {step.icon}
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono mb-0.5">Stage 0{idx + 1}</div>
              <div className="text-xs font-bold text-white">{step.title}</div>
              <div className="text-[10px] text-slate-400 mt-1 leading-snug">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
