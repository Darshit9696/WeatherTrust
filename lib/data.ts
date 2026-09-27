import { FlaggedEvent } from './types';

export const SENSOR_DISPLAY_NAMES: Record<string, string> = {
  temp_2m: 'Air Temp @ 2m',
  temp_4m: 'Air Temp @ 4m',
  temp_8m: 'Air Temp @ 8m',
  rh_2m: 'Rel. Humidity @ 2m',
  rh_4m: 'Rel. Humidity @ 4m',
  rh_8m: 'Rel. Humidity @ 8m',
  pressure: 'Atmospheric Pressure',
  battery_voltage: 'Battery Voltage',
  wind_speed_10m: 'Wind Speed @ 10m',
  rainfall: 'Rainfall (Cumulative)',
};

export const SENSOR_UNITS: Record<string, string> = {
  temp_2m: '°C',
  temp_4m: '°C',
  temp_8m: '°C',
  rh_2m: '%',
  rh_4m: '%',
  rh_8m: '%',
  pressure: 'mbar',
  battery_voltage: 'V',
  wind_speed_10m: 'm/s',
  rainfall: 'mm',
};

export function getClassificationBadge(classification: string) {
  switch (classification) {
    case 'PROBABLE_SENSOR_FAULT':
      return {
        label: 'PROBABLE SENSOR FAULT',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
      };
    case 'POSSIBLE_WEATHER_EXTREME':
      return {
        label: 'POSSIBLE WEATHER EXTREME',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        dot: 'bg-amber-500',
      };
    case 'UNCERTAIN':
      return {
        label: 'UNCERTAIN',
        bg: 'bg-sky-500/10',
        text: 'text-sky-400',
        border: 'border-sky-500/30',
        dot: 'bg-sky-500',
      };
    default:
      return {
        label: 'NORMAL',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
  }
}

export function formatTimestamp(ts: string): string {
  if (!ts) return '';
  return ts.replace('T', ' ').substring(0, 16);
}

/**
 * Formats ISO or space timestamp into professional console format:
 * e.g., "19 Mar 2016 · 11:30"
 */
export function formatDisplayTime(ts: string): string {
  if (!ts) return '';
  const clean = ts.replace('T', ' ');
  const parts = clean.split(' ');
  if (parts.length < 2) return clean;
  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = monthNames[monthIdx] || month;
  const timeShort = timePart.substring(0, 5);
  return `${parseInt(day, 10)} ${monthName} ${year} · ${timeShort}`;
}

/**
 * Deterministically derives the concise Primary Evidence summary string exclusively from real JSON evidence & metrics.
 */
export function getPrimaryEvidenceSummary(ev: FlaggedEvent): string {
  // 1. Cross-sensor divergence combined with temporal rate/rebound metrics
  if (ev.cross_sensor_evidence && ev.temporal_evidence) {
    const dev = ev.cross_sensor_evidence.deviation_from_consensus;
    const hasRebound =
      ev.temporal_evidence.delta_prev !== undefined &&
      ev.temporal_evidence.delta_next !== undefined &&
      Math.sign(ev.temporal_evidence.delta_prev) !== Math.sign(ev.temporal_evidence.delta_next);

    if (dev !== undefined) {
      return `${dev.toFixed(1)}°C cross-sensor divergence + ${
        hasRebound ? 'abrupt rebound' : `step jump (${ev.temporal_evidence.delta_prev?.toFixed(1) || ''})`
      }`;
    }
  }

  // 2. Correlated power failure / sentinel dropout
  if (ev.power_evidence && ev.sensor === 'pressure' && (ev.numeric_value === 0 || ev.raw_value === '0.0')) {
    return '0 mbar + simultaneous battery power loss';
  }

  if (ev.power_evidence && ev.power_evidence.details) {
    return ev.power_evidence.details;
  }

  // 3. Isolated cross-sensor consensus conflict
  if (ev.cross_sensor_evidence) {
    const dev = ev.cross_sensor_evidence.deviation_from_consensus;
    return `${dev !== undefined ? dev.toFixed(1) + '°C' : ''} divergence from colocated consensus`;
  }

  // 4. Isolated temporal rate spike or rebound
  if (ev.temporal_evidence) {
    const j = ev.temporal_evidence.delta_prev;
    const r = ev.temporal_evidence.delta_next;
    const hasRebound = j !== undefined && r !== undefined && Math.sign(j) !== Math.sign(r);
    return hasRebound
      ? `Transient jump (${j?.toFixed(1) || ''}) + rebound (${r && r > 0 ? '+' : ''}${r?.toFixed(1) || ''})`
      : `Temporal rate jump (${j?.toFixed(1) || ''})`;
  }

  // 5. Multi-height consensus validation recorded in JSON explanation
  if (ev.explanation && ev.explanation.includes('colocated sensors agree')) {
    return 'Multi-height agreement + smooth temporal progression';
  }

  // 6. Direct warning or fault signals from JSON
  if (ev.warning_signals && ev.warning_signals.length > 0) {
    return ev.warning_signals[0];
  }

  if (ev.rule_flags && ev.rule_flags.length > 0) {
    return ev.rule_flags.map((r) => r.replace(/_/g, ' ')).join(', ');
  }

  if (ev.fault_signals && ev.fault_signals.length > 0) {
    return ev.fault_signals[0].split(':')[0];
  }

  if (ev.explanation && ev.explanation.length > 0) {
    return ev.explanation.length > 60 ? ev.explanation.substring(0, 60) + '...' : ev.explanation;
  }

  return 'Detailed evidence unavailable for this event';
}
