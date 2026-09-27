'use client';

import React, { useState, useEffect } from 'react';
import { WeatherTrustResults, FlaggedEvent } from '@/lib/types';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { SummaryCards } from './SummaryCards';
import { TelemetryOverviewPreview } from './TelemetryOverviewPreview';
import { TimeSeriesExplorer } from './TimeSeriesExplorer';
import { StationHealthSummary } from './StationHealthSummary';
import { ImportantEvents } from './ImportantEvents';
import { SensorHealthPanel } from './SensorHealthPanel';
import { HealthHistoryChart } from './HealthHistoryChart';
import { FlaggedEventsTable } from './FlaggedEventsTable';
import { PipelineMethodology } from './PipelineMethodology';
import { EventExplanationDrawer } from './EventExplanationDrawer';
import { Footer } from './Footer';

interface DashboardClientProps {
  data: WeatherTrustResults;
  initialTab?: NavTab;
}

export const WeatherTrustDashboardClient: React.FC<DashboardClientProps> = ({
  data,
  initialTab = 'overview',
}) => {
  const [currentTab, setCurrentTab] = useState<NavTab>(initialTab);
  const [selectedEvent, setSelectedEvent] = useState<FlaggedEvent | null>(null);

  // Sync state with URL if browser back/forward is used
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      if (path === '/telemetry') setCurrentTab('telemetry');
      else if (path === '/events') setCurrentTab('events');
      else if (path === '/health') setCurrentTab('health');
      else if (path === '/methodology') setCurrentTab('methodology');
      else setCurrentTab('overview');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (tab: NavTab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      const path = tab === 'overview' ? '/' : `/${tab}`;
      if (window.location.pathname !== path) {
        window.history.pushState(null, '', path);
      }
    }
  };

  const faultCount = data.summary_statistics.classification_breakdown.PROBABLE_SENSOR_FAULT;

  return (
    <div className="min-h-screen flex bg-background text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
      {/* 1. Left Application Shell Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => navigateTo(tab)}
        faultCount={faultCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 2. Top Application Bar */}
        <Header station={data.station_metadata} dataset={data.dataset_metadata} />

        {/* 3. Tab Views */}
        <main className="flex-1 p-5 space-y-4 max-w-[1600px] w-full mx-auto">
          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-4">
              {/* Executive KPI Cards */}
              <SummaryCards
                stats={data.summary_statistics}
                totalObservations={data.dataset_metadata.total_observations}
              />

              {/* Telemetry Stream Preview + Compact Station Health */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                <div className="xl:col-span-2">
                  <TelemetryOverviewPreview
                    data={data.dashboard_time_series}
                    onOpenWorkspace={() => navigateTo('telemetry')}
                    onSelectEvent={(ev) => setSelectedEvent(ev)}
                    topAnomalies={data.top_detected_anomalies}
                  />
                </div>
                <div className="xl:col-span-1">
                  <StationHealthSummary
                    healthRecords={data.final_sensor_health}
                    onNavigateToHealth={() => navigateTo('health')}
                  />
                </div>
              </div>

              {/* Important Operational Events */}
              <ImportantEvents
                events={data.top_detected_anomalies}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onNavigateToEvents={() => navigateTo('events')}
              />
            </div>
          )}

          {/* TAB 2: TELEMETRY WORKSPACE */}
          {currentTab === 'telemetry' && (
            <div className="space-y-4">
              <TimeSeriesExplorer
                data={data.dashboard_time_series}
                topAnomalies={data.top_detected_anomalies}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            </div>
          )}

          {/* TAB 3: EVENTS & ALERTS */}
          {currentTab === 'events' && (
            <div className="space-y-4">
              <FlaggedEventsTable
                events={data.flagged_events}
                summaryStats={data.summary_statistics}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            </div>
          )}

          {/* TAB 4: SENSOR HEALTH */}
          {currentTab === 'health' && (
            <div className="space-y-4">
              <SensorHealthPanel healthRecords={data.final_sensor_health} />
              <HealthHistoryChart healthHistory={data.health_history} />
            </div>
          )}

          {/* TAB 5: METHODOLOGY */}
          {currentTab === 'methodology' && (
            <div className="space-y-4">
              <PipelineMethodology />
            </div>
          )}
        </main>

        {/* Compact Footer */}
        <Footer />
      </div>

      {/* Global Event Diagnosis Drawer */}
      <EventExplanationDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        sensorHealthRecords={data.final_sensor_health}
        healthHistory={data.health_history}
        timeSeriesData={data.dashboard_time_series}
      />
    </div>
  );
};
