import test from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidStoredPreferenceError,
  LocalStoragePreferenceRepository,
  PREFERENCE_SCHEMA_VERSION,
  PREFERENCE_STORAGE_KEY,
  PreferenceStorageQuotaError,
  PreferenceStorageUnavailableError
} from '../src/infrastructure/storage/LocalStoragePreferenceRepository.js';
import { DEFAULT_GLOBAL_TARGET_ALLOCATIONS, DEFAULT_HOUSEHOLD_GOAL, DEFAULT_STOCK_TARGET_ALLOCATIONS, FALLBACK_USERS } from '../src/domain/portfolio/constants.js';

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

test('returns documented defaults when preferences are absent', () => {
  const repository = new LocalStoragePreferenceRepository(new MemoryStorage());
  assert.equal(repository.getSelectedOwner(), FALLBACK_USERS[0]);
  assert.equal(repository.getHouseholdGoal(), DEFAULT_HOUSEHOLD_GOAL);
  assert.deepEqual(repository.getStockAllocation(), DEFAULT_STOCK_TARGET_ALLOCATIONS);
  assert.deepEqual(repository.getGlobalAllocation(), DEFAULT_GLOBAL_TARGET_ALLOCATIONS);
});

test('migrates legacy keys into the current versioned document', () => {
  const storage = new MemoryStorage({
    'oszczednosci.selectedUser': 'ZOSIA',
    'oszczednosci.householdGoal': '750000',
    'oszczednosci.stockTargetAllocations': JSON.stringify({ ZLOTO: 20, RYNKI_ROZWINIETE: 60, RYNKI_ROZWIJAJACE_SIE: 20 }),
    'oszczednosci.globalTargetAllocations': JSON.stringify({ BONDS: 40, STOCKS: 40, GOLD: 20 })
  });
  const repository = new LocalStoragePreferenceRepository(storage);
  assert.equal(repository.getSelectedOwner(), 'ZOSIA');
  const document = JSON.parse(storage.getItem(PREFERENCE_STORAGE_KEY));
  assert.equal(document.version, PREFERENCE_SCHEMA_VERSION);
  assert.equal(document.preferences.householdGoal, 750000);
});

test('validates deserialized domain values', () => {
  const storage = new MemoryStorage({ [PREFERENCE_STORAGE_KEY]: JSON.stringify({
    version: PREFERENCE_SCHEMA_VERSION,
    preferences: { selectedOwner: 'JAKUB', householdGoal: -1, stockAllocation: DEFAULT_STOCK_TARGET_ALLOCATIONS, globalAllocation: DEFAULT_GLOBAL_TARGET_ALLOCATIONS }
  }) });
  assert.throws(() => new LocalStoragePreferenceRepository(storage).getHouseholdGoal(), InvalidStoredPreferenceError);
});

test('maps unavailable and quota-limited storage to typed errors', () => {
  const unavailable = { getItem() { throw new DOMException('blocked', 'SecurityError'); } };
  assert.throws(() => new LocalStoragePreferenceRepository(unavailable).getSelectedOwner(), PreferenceStorageUnavailableError);
  assert.throws(() => new LocalStoragePreferenceRepository(() => { throw new DOMException('blocked', 'SecurityError'); }).getSelectedOwner(), PreferenceStorageUnavailableError);

  const quota = new MemoryStorage();
  quota.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  assert.throws(() => new LocalStoragePreferenceRepository(quota).setSelectedOwner('ZOSIA'), PreferenceStorageQuotaError);
});
