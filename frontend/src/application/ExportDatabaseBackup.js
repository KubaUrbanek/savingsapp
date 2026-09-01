export class ExportDatabaseBackup {
  constructor(backups) { this.backups = backups; }
  execute() { return this.backups.export(); }
}
