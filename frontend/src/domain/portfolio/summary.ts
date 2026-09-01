// @ts-nocheck
import { TimeSeriesService } from './services/TimeSeriesService.js';

export function buildSummary(entries, period) {
  return TimeSeriesService.generate(entries, period);
}
