// @ts-nocheck
export class DeleteInvestmentEntry {
  constructor(entries) {
    this.entries = entries;
  }
  execute(id) {
    return this.entries.delete(id);
  }
}
