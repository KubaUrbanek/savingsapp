package pl.oszczednosci.app.application.port.in;

/** Replaces all investment aggregates only after a complete backup has been validated. */
public interface ImportInvestmentBackupUseCase {
    void importBackup(ImportInvestmentBackupCommand command);
}
