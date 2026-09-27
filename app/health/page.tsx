import { getResultsData } from '@/lib/results';
import { WeatherTrustDashboardClient } from '@/components/WeatherTrustDashboardClient';

export const dynamic = 'force-static';

export default function HealthPage() {
  const data = getResultsData();

  return <WeatherTrustDashboardClient data={data} initialTab="health" />;
}
