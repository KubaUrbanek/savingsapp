package pl.oszczednosci.app.application.port.out;
import java.util.*; import pl.oszczednosci.app.domain.model.*;
public interface InvestmentEntryRepository {
 InvestmentEntry save(InvestmentEntry entry); Optional<InvestmentEntry> findById(UUID id); void deleteById(UUID id);
 List<InvestmentEntry> findByOwner(PortfolioUser owner);
}
