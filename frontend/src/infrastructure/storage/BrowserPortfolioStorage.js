export const STORAGE_KEYS = {
  selectedUser: 'oszczednosci.selectedUser', householdGoal: 'oszczednosci.householdGoal',
  stockAllocations: 'oszczednosci.stockTargetAllocations', globalAllocations: 'oszczednosci.globalTargetAllocations'
};

export class BrowserPortfolioStorage {
  constructor(storage) { this.storage = storage; }
  get(key, fallback) { const value = this.storage.getItem(STORAGE_KEYS[key]); return value == null ? fallback : value; }
  set(key, value) { this.storage.setItem(STORAGE_KEYS[key], String(value)); }
  getJson(key, fallback) { try { return JSON.parse(this.get(key, 'null')) ?? fallback; } catch { return fallback; } }
  setJson(key, value) { this.set(key, JSON.stringify(value)); }
}
