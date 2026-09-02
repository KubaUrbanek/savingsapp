package pl.oszczednosci.app.adapter.out.persistence.json;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;

public final class JsonInvestmentOperationRepository implements InvestmentOperationRepository {
    private static final Comparator<InvestmentOperation> NEWEST_FIRST = Comparator
            .comparing(InvestmentOperation::getDate, Comparator.reverseOrder())
            .thenComparing(InvestmentOperation::getCreatedAt, Comparator.reverseOrder());
    private final JsonInvestmentStore store;
    public JsonInvestmentOperationRepository(JsonInvestmentStore store) { this.store = store; }
    @Override public synchronized InvestmentOperation save(InvestmentOperation operation) {
        store.update(current -> {
            List<InvestmentOperation> values = new java.util.ArrayList<>(current.operations());
            values.removeIf(value -> value.getId().equals(operation.getId()));
            values.add(operation);
            return new InvestmentBackup(current.formatVersion(), current.entries(), values);
        });
        return operation;
    }
    @Override public synchronized Optional<InvestmentOperation> find(InvestmentOperationId id) {
        return store.snapshot().operations().stream().filter(value -> value.id().equals(id)).findFirst();
    }
    @Override public synchronized List<InvestmentOperation> matching(InvestmentOperationCriteria criteria) {
        return List.copyOf(store.snapshot().operations().stream()
                .filter(v -> v.getOwner().equals(criteria.owner()))
                .filter(v -> criteria.type().map(type -> v.getType() == type).orElse(true))
                .filter(v -> criteria.subcategory().map(subcategory -> v.getSubcategory() == subcategory).orElse(true))
                .sorted(NEWEST_FIRST).toList());
    }
    @Override public synchronized DeleteResult delete(InvestmentOperationId id) {
        boolean[] deleted = {false};
        store.update(current -> {
            List<InvestmentOperation> values = new java.util.ArrayList<>(current.operations());
            deleted[0] = values.removeIf(value -> value.id().equals(id));
            return deleted[0] ? new InvestmentBackup(current.formatVersion(), current.entries(), values) : current;
        });
        return deleted[0] ? DeleteResult.DELETED : DeleteResult.NOT_FOUND;
    }
}
