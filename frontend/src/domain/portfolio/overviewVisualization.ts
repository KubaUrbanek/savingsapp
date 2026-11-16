import { globalAssetClass, InvestmentType } from './classification.js';
import { isNewerEntry, snapshotKey } from './snapshot.js';

export type OverviewGrouping = 'accounts' | 'assetClasses';
export type OverviewRange = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
export type OverviewEntry = {
  owner: string;
  type: string;
  subcategory?: string | null;
  valuePln: number;
  date: string;
  createdAt: string;
  id?: string | number;
};
type Classification = Pick<OverviewEntry, 'type' | 'subcategory'>;
export type OverviewHistoryPoint = {
  date: string;
  total: number;
  groups: Record<string, number>;
  incomplete?: boolean;
};

const assetClassOrder = ['BONDS', 'STOCKS', 'GOLD', 'BITCOIN', 'CASH', 'UNCLASSIFIED'];

export function groupKey(entry: Classification, grouping: OverviewGrouping): string {
  return grouping === 'accounts' ? entry.type : globalAssetClass(entry);
}

export function availableGroups(entries: Classification[], grouping: OverviewGrouping): string[] {
  const present = new Set(entries.map((entry) => groupKey(entry, grouping)));
  const order: string[] = grouping === 'accounts' ? InvestmentType.values : assetClassOrder;
  return order.filter((key) => present.has(key));
}

export function filterOverviewEntries<T extends Classification>(
  entries: T[],
  grouping: OverviewGrouping,
  excludedGroups: string[]
): T[] {
  const excluded = new Set(excludedGroups);
  return entries.filter((entry) => !excluded.has(groupKey(entry, grouping)));
}

function recordLatest(latest: Map<string, OverviewEntry>, entry: OverviewEntry) {
  const key = snapshotKey(entry);
  if (isNewerEntry(entry, latest.get(key))) latest.set(key, entry);
}

function groupValues(entries: Iterable<OverviewEntry>, grouping: OverviewGrouping, keys: string[]) {
  const values = [...entries];
  const present = new Set(values.map((entry) => groupKey(entry, grouping)));
  const cents = new Map<string, number>(keys.filter((key) => present.has(key)).map((key) => [key, 0]));
  for (const entry of values) {
    const key = groupKey(entry, grouping);
    cents.set(key, (cents.get(key) || 0) + Math.round(Number(entry.valuePln) * 100));
  }
  return cents;
}

export function buildOverviewDistribution(
  entries: OverviewEntry[],
  grouping: OverviewGrouping
): { key: string; value: number; share: number }[] {
  const latest = new Map<string, OverviewEntry>();
  for (const entry of entries) recordLatest(latest, entry);
  const cents = groupValues(latest.values(), grouping, availableGroups(entries, grouping));
  const total = [...cents.values()].reduce((sum, value) => sum + value, 0);
  return [...cents].map(([key, value]) => ({
    key,
    value: value / 100,
    share: total > 0 ? (value / total) * 100 : 0
  }));
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function subtractMonths(date: string, months: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const monthEnd = new Date(result.getTime());
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);
  result.setUTCDate(Math.min(day, monthEnd.getUTCDate()));
  return result.toISOString().slice(0, 10);
}

export function resolveOverviewRange(
  entries: OverviewEntry[],
  today: string,
  range: OverviewRange,
  customStart = '',
  customEnd = ''
): { start: string; end: string; error: string | null } {
  if (!validDate(today)) return { start: '', end: '', error: 'Nieprawidłowa bieżąca data.' };
  if (range === 'custom') {
    let error: string | null = null;
    if (!validDate(customStart) || !validDate(customEnd)) error = 'Podaj poprawną datę początku i końca zakresu.';
    else if (customStart > customEnd) error = 'Data początku nie może być późniejsza niż data końca.';
    else if (customEnd > today) error = 'Data końca nie może być późniejsza niż dzisiaj.';
    return { start: customStart, end: customEnd, error };
  }
  if (range === 'all') {
    const earliest = entries.reduce((date, entry) => (entry.date < date ? entry.date : date), today);
    return { start: earliest, end: today, error: null };
  }
  const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[range];
  return { start: subtractMonths(today, months), end: today, error: null };
}

export function buildOverviewHistory(
  entries: OverviewEntry[],
  grouping: OverviewGrouping,
  start: string,
  end: string
): OverviewHistoryPoint[] {
  if (!validDate(start) || !validDate(end) || start > end) return [];
  const sorted = entries
    .filter((entry) => entry.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const dates = [
    ...new Set([start, end, ...sorted.filter((entry) => entry.date >= start).map((entry) => entry.date)])
  ].sort();
  const keys = availableGroups(sorted, grouping);
  const latest = new Map<string, OverviewEntry>();
  const points: OverviewHistoryPoint[] = [];
  let index = 0;
  for (const date of dates) {
    while (index < sorted.length) {
      const entry = sorted[index];
      if (!entry || entry.date > date) break;
      recordLatest(latest, entry);
      index += 1;
    }
    // An unknown opening value is not evidence of a zero-valued portfolio.
    if (latest.size === 0) continue;
    const cents = groupValues(latest.values(), grouping, keys);
    const total = [...cents.values()].reduce((sum, value) => sum + value, 0) / 100;
    points.push({
      date,
      total,
      incomplete: latest.size < new Set(entries.map(snapshotKey)).size,
      groups: Object.fromEntries([...cents].map(([key, value]) => [key, value / 100]))
    });
  }
  return points;
}
