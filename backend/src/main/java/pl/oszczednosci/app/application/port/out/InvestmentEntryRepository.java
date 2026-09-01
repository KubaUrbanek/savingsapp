package pl.oszczednosci.app.application.port.out;

import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentEntryId;

/** Application-owned vocabulary for loading and persisting investment entries. */
public interface InvestmentEntryRepository {
    InvestmentEntry save(InvestmentEntry entry);
    Optional<InvestmentEntry> find(InvestmentEntryId id);
    List<InvestmentEntry> matching(InvestmentEntryCriteria criteria);
    DeleteResult delete(InvestmentEntryId id);
}
