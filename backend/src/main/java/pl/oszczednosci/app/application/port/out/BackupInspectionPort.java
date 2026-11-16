package pl.oszczednosci.app.application.port.out;
/** Validates a backup and encodes its exact values without storing it. */
public interface BackupInspectionPort {
 InvestmentBackup inspect(byte[] document);
 byte[] serialize(InvestmentBackup backup);
}
