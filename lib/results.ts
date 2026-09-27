import fs from 'fs';
import path from 'path';
import { WeatherTrustResults } from './types';

export function getResultsData(): WeatherTrustResults {
  const filePath = path.join(process.cwd(), 'output', 'weathertrust_results.json');
  if (!fs.existsSync(filePath)) {
    const fallbackPath = path.join(process.cwd(), 'public', 'weathertrust_results.json');
    const content = fs.readFileSync(fallbackPath, 'utf-8');
    return JSON.parse(content) as WeatherTrustResults;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as WeatherTrustResults;
}
