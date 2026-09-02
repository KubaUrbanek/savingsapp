package pl.oszczednosci.app.adapter.out.persistence.json;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;

public final class JsonInvestmentEntryRepository implements InvestmentEntryRepository {
    private static final Comparator<InvestmentEntry> NEWEST_FIRST = Comparator
            .comparing(InvestmentEntry::getDate, Comparator.reverseOrder())
            .thenComparing(InvestmentEntry::getCreatedAt, Comparator.reverseOrder());
    private final JsonInvestmentStore store;
    public JsonInvestmentEntryRepository(JsonInvestmentStore store) { this.store = store; }

    @Override public synchronized InvestmentEntry save(InvestmentEntry entry) {
        store.update(current -> {
            List<InvestmentEntry> entries = new java.util.ArrayList<>(current.entries());
            entries.removeIf(value -> value.getId().equals(entry.getId()));
            entries.add(entry);
            return new InvestmentBackup(current.formatVersion(), entries, current.operations());
        });
        return entry;
    }
    @Override public synchronized Optional<InvestmentEntry> find(InvestmentEntryId id) {
        return store.snapshot().entries().stream().filter(value -> value.id().equals(id)).findFirst();
    }
    @Override public synchronized List<InvestmentEntry> matching(InvestmentEntryCriteria criteria) {
        return List.copyOf(store.snapshot().entries().stream()
                .filter(v -> v.getOwner().equals(criteria.owner()))
                .filter(v -> criteria.type().map(type -> v.getType() == type).orElse(true))
                .filter(v -> criteria.subcategory().map(subcategory -> v.getSubcategory() == subcategory).orElse(true))
                .sorted(NEWEST_FIRST).toList());
    }
    @Override public synchronized DeleteResult delete(InvestmentEntryId id) {
        boolean[] deleted = {false};
        store.update(current -> {
            List<InvestmentEntry> entries = new java.util.ArrayList<>(current.entries());
            deleted[0] = entries.removeIf(value -> value.id().equals(id));
            return deleted[0] ? new InvestmentBackup(current.formatVersion(), entries, current.operations()) : current;
        });
        return deleted[0] ? DeleteResult.DELETED : DeleteResult.NOT_FOUND;
    }
}
