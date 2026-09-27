import { getResultsData } from '@/lib/results';
import { WeatherTrustDashboardClient } from '@/components/WeatherTrustDashboardClient';

export const dynamic = 'force-static';

export default function TelemetryPage() {
  const data = getResultsData();

  return <WeatherTrustDashboardClient data={data} initialTab="telemetry" />;
}
