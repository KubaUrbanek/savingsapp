package pl.oszczednosci.app.application.port.in;
import java.util.UUID;
public interface RecordPortfolioChangeUseCase {
    RecordPortfolioChangeResult record(RecordPortfolioChangeCommand command);
    RecordPortfolioChangeResult update(UUID id, RecordPortfolioChangeCommand command);
    void delete(UUID id);
}
