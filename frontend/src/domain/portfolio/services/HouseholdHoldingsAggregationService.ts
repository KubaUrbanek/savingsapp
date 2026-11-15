import { aggregatePerformance } from './PerformanceAggregationService.js';

type Holding = {
  type: string;
  subcategory?: string | null;
  valuePln: number;
  date: string;
  performance?: Record<string, number | null> | null;
};

/** Aggregate current owner holdings; select the latest per owner before calling. */
export function aggregateHouseholdHoldings(holdings: Holding[]) {
  const groups = new Map<string, Holding[]>();
  for (const holding of holdings) {
    const key = holding.subcategory ? `subcategory:${holding.subcategory}` : `type:${holding.type}`;
    const group = groups.get(key) ?? [];
    group.push(holding);
    groups.set(key, group);
  }
  return Array.from(groups, ([id, members]) => {
    const dates = members.map((member) => member.date).sort();
    return {
      id,
      type: members[0]!.type,
      subcategory: members[0]!.subcategory,
      valuePln: members.reduce((sum, member) => sum + Number(member.valuePln), 0),
      date: dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} – ${dates.at(-1)}`,
      performance: aggregatePerformance(members.map((member) => member.performance))
    };
  });
}
