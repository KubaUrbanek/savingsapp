// @ts-nocheck
import { buildCurrentSnapshot } from '../snapshot.js';

export const HouseholdAggregationService = Object.freeze({
  aggregate(entries, users, types, goal, latestPeriod = null) {
    const snapshot = buildCurrentSnapshot(entries);
    const sum = (items) => items.reduce((total, entry) => total + Number(entry.valuePln), 0);
    const total = sum(snapshot);
    const totalsByOwner = Object.fromEntries(
      users.map((owner) => [owner, sum(snapshot.filter((e) => e.owner === owner))])
    );
    const totalsByType = Object.fromEntries(types.map((type) => [type, sum(snapshot.filter((e) => e.type === type))]));
    const liquid = sum(snapshot.filter((e) => ['KONTO_BANKOWE', 'KONTO_OSZCZEDNOSCIOWE'].includes(e.type)));
    const retirement = sum(snapshot.filter((e) => ['IKE', 'IKZE', 'PPK', 'PPO'].includes(e.type)));
    return {
      total,
      totalsByOwner,
      totalsByType,
      liquid,
      retirement,
      longTerm: total - liquid,
      latestMonth: latestPeriod,
      goalProgress: goal > 0 ? Math.min((total / goal) * 100, 100) : 0
    };
  }
});
