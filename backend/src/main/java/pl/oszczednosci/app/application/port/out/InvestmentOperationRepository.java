package pl.oszczednosci.app.application.port.out;

import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.domain.model.InvestmentOperation;
import pl.oszczednosci.app.domain.model.InvestmentOperationId;

public interface InvestmentOperationRepository {
    InvestmentOperation save(InvestmentOperation operation);
    Optional<InvestmentOperation> find(InvestmentOperationId id);
    List<InvestmentOperation> matching(InvestmentOperationCriteria criteria);
    DeleteResult delete(InvestmentOperationId id);
}
