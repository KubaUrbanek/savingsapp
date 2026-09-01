export class ImportDatabaseBackup {
  constructor(backups) { this.backups = backups; }
  execute(file) { return this.backups.import(file); }
}
