package pl.oszczednosci.app.application.port.out;

public interface InvestmentBackupPort {
    byte[] exportBackup();
    void importBackup(byte[] document);
}
