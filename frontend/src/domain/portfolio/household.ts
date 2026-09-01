// @ts-nocheck
import { buildSummary } from './summary.js';
import { HouseholdAggregationService } from './services/HouseholdAggregationService.js';

export function buildHouseholdOverview(entries, users, types, goal) {
  const summary = buildSummary(entries, 'monthly');
  return HouseholdAggregationService.aggregate(entries, users, types, goal, summary.at(-1));
}
