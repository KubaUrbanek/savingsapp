// @ts-nocheck
import {
  DEFAULT_GLOBAL_TARGET_ALLOCATIONS,
  DEFAULT_HOUSEHOLD_GOAL,
  DEFAULT_STOCK_TARGET_ALLOCATIONS,
  FALLBACK_USERS,
  GLOBAL_ASSET_CLASSES,
  STOCK_SUBCATEGORIES
} from '../../domain/portfolio/constants.js';
import { AllocationWeight, Money, OwnerId } from '../../domain/portfolio/values.js';

export const PREFERENCE_STORAGE_KEY = 'oszczednosci.preferences';
export const PREFERENCE_SCHEMA_VERSION = 2;

export class PreferenceStorageError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'PreferenceStorageError';
  }
}
export class PreferenceStorageUnavailableError extends PreferenceStorageError {
  constructor(cause) {
    super('Preference storage is unavailable', cause);
    this.name = 'PreferenceStorageUnavailableError';
  }
}
export class PreferenceStorageQuotaError extends PreferenceStorageError {
  constructor(cause) {
    super('Preference storage quota was exceeded', cause);
    this.name = 'PreferenceStorageQuotaError';
  }
}
export class InvalidStoredPreferenceError extends PreferenceStorageError {
  constructor(message, cause) {
    super(message, cause);
    this.name = 'InvalidStoredPreferenceError';
  }
}

const LEGACY_KEYS = {
  selectedOwner: 'oszczednosci.selectedUser',
  householdGoal: 'oszczednosci.householdGoal',
  stockAllocation: 'oszczednosci.stockTargetAllocations',
  globalAllocation: 'oszczednosci.globalTargetAllocations'
};

const defaults = () => ({
  selectedOwner: FALLBACK_USERS[0],
  householdGoal: DEFAULT_HOUSEHOLD_GOAL,
  stockAllocation: { ...DEFAULT_STOCK_TARGET_ALLOCATIONS },
  globalAllocation: { ...DEFAULT_GLOBAL_TARGET_ALLOCATIONS }
});

function allocation(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object`);
  return Object.fromEntries(keys.map((key) => [key, AllocationWeight.parse(value[key])]));
}

function validated(data) {
  return {
    selectedOwner: OwnerId.parse(data.selectedOwner),
    householdGoal: Money.positive(data.householdGoal, 'householdGoal'),
    stockAllocation: allocation(data.stockAllocation, STOCK_SUBCATEGORIES, 'stockAllocation'),
    globalAllocation: allocation(data.globalAllocation, GLOBAL_ASSET_CLASSES, 'globalAllocation')
  };
}

export class LocalStoragePreferenceRepository {
  constructor(storage) {
    this.storageProvider = typeof storage === 'function' ? storage : () => storage;
  }

  getSelectedOwner() {
    return this.#read().selectedOwner;
  }
  setSelectedOwner(selectedOwner) {
    this.#update({ selectedOwner: OwnerId.parse(selectedOwner) });
  }
  getHouseholdGoal() {
    return this.#read().householdGoal;
  }
  setHouseholdGoal(householdGoal) {
    this.#update({ householdGoal: Money.positive(householdGoal, 'householdGoal') });
  }
  getStockAllocation() {
    return this.#read().stockAllocation;
  }
  setStockAllocation(stockAllocation) {
    this.#update({ stockAllocation: allocation(stockAllocation, STOCK_SUBCATEGORIES, 'stockAllocation') });
  }
  getGlobalAllocation() {
    return this.#read().globalAllocation;
  }
  setGlobalAllocation(globalAllocation) {
    this.#update({ globalAllocation: allocation(globalAllocation, GLOBAL_ASSET_CLASSES, 'globalAllocation') });
  }

  #read() {
    try {
      const raw = this.#storage().getItem(PREFERENCE_STORAGE_KEY);
      if (raw == null) return this.#migrateLegacy();
      const document = JSON.parse(raw);
      const migrated =
        document?.version === 1
          ? {
              ...defaults(),
              ...document.preferences,
              selectedOwner: document.preferences?.selectedUser ?? document.preferences?.selectedOwner
            }
          : document?.preferences;
      if (![1, PREFERENCE_SCHEMA_VERSION].includes(document?.version))
        throw new TypeError('Unsupported preference schema version');
      const preferences = validated({ ...defaults(), ...migrated });
      if (document.version !== PREFERENCE_SCHEMA_VERSION) this.#write(preferences);
      return preferences;
    } catch (error) {
      if (error instanceof PreferenceStorageError) throw error;
      if (error instanceof SyntaxError || error instanceof TypeError)
        throw new InvalidStoredPreferenceError('Stored preferences are invalid', error);
      throw this.#storageError(error);
    }
  }

  #migrateLegacy() {
    const data = defaults();
    const storage = this.#storage();
    const owner = storage.getItem(LEGACY_KEYS.selectedOwner);
    const goal = storage.getItem(LEGACY_KEYS.householdGoal);
    const stock = storage.getItem(LEGACY_KEYS.stockAllocation);
    const global = storage.getItem(LEGACY_KEYS.globalAllocation);
    if (owner != null) data.selectedOwner = owner;
    if (goal != null) data.householdGoal = goal;
    if (stock != null) data.stockAllocation = JSON.parse(stock);
    if (global != null) data.globalAllocation = JSON.parse(global);
    const preferences = validated(data);
    if ([owner, goal, stock, global].some((value) => value != null)) this.#write(preferences);
    return preferences;
  }

  #update(change) {
    this.#write({ ...this.#read(), ...change });
  }
  #write(preferences) {
    try {
      this.#storage().setItem(
        PREFERENCE_STORAGE_KEY,
        JSON.stringify({ version: PREFERENCE_SCHEMA_VERSION, preferences })
      );
    } catch (error) {
      throw this.#storageError(error);
    }
  }
  #storageError(error) {
    return error?.name === 'QuotaExceededError'
      ? new PreferenceStorageQuotaError(error)
      : new PreferenceStorageUnavailableError(error);
  }
  #storage() {
    try {
      const storage = this.storageProvider();
      if (!storage) throw new Error('Storage was not provided');
      return storage;
    } catch (error) {
      throw this.#storageError(error);
    }
  }
}
