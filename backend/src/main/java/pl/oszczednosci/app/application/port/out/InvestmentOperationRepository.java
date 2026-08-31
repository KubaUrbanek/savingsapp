package pl.oszczednosci.app.application.port.out;
import java.util.*; import pl.oszczednosci.app.domain.model.*;
public interface InvestmentOperationRepository { InvestmentOperation save(InvestmentOperation operation); List<InvestmentOperation> findByOwner(PortfolioUser owner); void deleteById(UUID id); }
