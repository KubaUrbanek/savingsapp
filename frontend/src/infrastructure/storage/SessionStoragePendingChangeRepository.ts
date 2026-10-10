// @ts-nocheck
/** Keeps uncertain request identifiers across reloads in the same browser tab. No financial amounts are stored. */
export class SessionStoragePendingChangeRepository {
  constructor(storage) {
    this.storage = storage;
  }
  get(signature) {
    return this.storage.getItem(`oszczednosci.pending.${signature}`);
  }
  put(signature, id) {
    this.storage.setItem(`oszczednosci.pending.${signature}`, id);
  }
  remove(signature) {
    this.storage.removeItem(`oszczednosci.pending.${signature}`);
  }
}
