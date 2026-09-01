package pl.oszczednosci.app.application.port.in;

/** Exports one consistent backup containing every investment aggregate. */
public interface ExportInvestmentBackupUseCase {
    byte[] exportBackup();
}
