// @ts-nocheck
export function snapshotKey(entry) {
  return `${entry.owner || 'OWNER'}:${entry.type}:${entry.subcategory || 'NONE'}`;
}

export function isNewerEntry(candidate, current) {
  return (
    !current ||
    candidate.date > current.date ||
    (candidate.date === current.date && candidate.createdAt > current.createdAt)
  );
}

export function buildCurrentSnapshot(entries) {
  const latest = {};
  for (const entry of entries) {
    const key = snapshotKey(entry);
    if (isNewerEntry(entry, latest[key])) latest[key] = entry;
  }
  return Object.values(latest);
}
