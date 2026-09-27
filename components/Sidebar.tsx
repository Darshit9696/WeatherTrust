'use client';

import React from 'react';
import {
  LayoutDashboard,
  LineChart,
  AlertTriangle,
  ShieldCheck,
  GitMerge,
  Radio,
  Database,
  ExternalLink,
} from 'lucide-react';

export type NavTab = 'overview' | 'telemetry' | 'events' | 'health' | 'methodology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  faultCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, faultCount }) => {
  const navItems: { id: NavTab; href: string; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'overview',
      href: '/',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'telemetry',
      href: '/telemetry',
      label: 'Telemetry',
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      id: 'events',
      href: '/events',
      label: 'Events & Alerts',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: faultCount,
    },
    {
      id: 'health',
      href: '/health',
      label: 'Sensor Health',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'methodology',
      href: '/methodology',
      label: 'Methodology',
      icon: <GitMerge className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-56 bg-slate-950/80 border-r border-surface-border flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-surface-border/60">
          <div className="w-7 h-7 rounded-md bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block leading-none">
              WeatherTrust
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-1">
              AWS Console
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Monitoring
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTab(item.id);
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', item.href);
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-brand-400' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Station Context & Transparency */}
      <div className="p-3 border-t border-surface-border/60 bg-slate-950/40">
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Data Ingestion</span>
          </div>

          <div className="text-[11px] text-slate-300 font-mono leading-tight">
            MOSDAC / ISRO
            <span className="text-[10px] text-slate-500 block font-sans mt-0.5">
              Historical AWS Archive
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Verified Pass
            </span>
            <span className="font-mono">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
