import { buildCurrentSnapshot } from './snapshot.js';
import { buildSummary } from './summary.js';

export function buildHouseholdOverview(entries, users, types, goal) {
  const snapshot = buildCurrentSnapshot(entries);
  const sum = (items) => items.reduce((total, entry) => total + Number(entry.valuePln), 0);
  const total = sum(snapshot);
  const totalsByOwner = Object.fromEntries(users.map((user) => [user, sum(snapshot.filter((e) => e.owner === user))]));
  const totalsByType = Object.fromEntries(types.map((type) => [type, sum(snapshot.filter((e) => e.type === type))]));
  const liquid = sum(snapshot.filter((e) => ['KONTO_BANKOWE', 'KONTO_OSZCZEDNOSCIOWE'].includes(e.type)));
  const retirement = sum(snapshot.filter((e) => ['IKE', 'IKZE', 'PPK', 'PPO'].includes(e.type)));
  const summary = buildSummary(entries, 'monthly');
  return { total, totalsByOwner, totalsByType, liquid, retirement, longTerm: total - liquid,
    latestMonth: summary.at(-1), goalProgress: goal > 0 ? Math.min(total / goal * 100, 100) : 0 };
}
