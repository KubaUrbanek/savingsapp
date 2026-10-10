interface DatedAssetRecord {
  id: string;
  owner: string;
  type: string;
  subcategory?: string | null;
  date: string;
  createdAt?: string | null;
}
interface HistoryEntry extends DatedAssetRecord {
  valuePln: number;
}
interface HistoryOperation extends DatedAssetRecord {
  operationType: string;
  amountPln: number;
  groupId?: string | null;
  note?: string | null;
}
export interface HistoryRow extends DatedAssetRecord {
  kind: string;
  record: 'operation' | 'entry';
  valuePln: number | undefined;
  amountPln?: number;
  cashType?: string | undefined;
  legacy?: boolean;
  note?: string | null;
}
/** Merge dated changes, retaining one row for an event with linked balances. */
export function portfolioHistory(entries: HistoryEntry[], operations: HistoryOperation[]): HistoryRow[] {
  const linked = new Set(operations.filter((o) => o.groupId).map((o) => o.id));
  const rows: HistoryRow[] = operations
    .filter((o) => !o.groupId || o.groupId === o.id || !operations.some((primary) => primary.id === o.groupId))
    .map((o) => ({
      ...o,
      kind: o.operationType,
      record: 'operation',
      valuePln: entries.find((e) => e.id === o.id)?.valuePln,
      cashType: operations.find((leg) => leg.groupId === o.id && leg.id !== o.id)?.type,
      legacy: !o.groupId
    }));
  rows.push(
    ...entries.filter((e) => !linked.has(e.id)).map((e): HistoryRow => ({ ...e, kind: 'VALUATION', record: 'entry' }))
  );
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id)
  );
}
