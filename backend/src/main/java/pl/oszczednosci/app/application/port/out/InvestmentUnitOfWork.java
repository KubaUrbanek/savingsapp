package pl.oszczednosci.app.application.port.out;

/** Atomically observes or replaces both aggregate collections. */
public interface InvestmentUnitOfWork {
    InvestmentBackup snapshot();
    void replaceAll(InvestmentBackup backup);
    void update(java.util.function.UnaryOperator<InvestmentBackup> change);
}
