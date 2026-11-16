// @ts-nocheck
export class ImportDatabaseBackup {
  constructor(backups) {
    this.backups = backups;
  }
  preview(file, selectedPlan) {
    return this.backups.inspect(file, selectedPlan);
  }
  execute(file) {
    return this.backups.import(file);
  }
}
