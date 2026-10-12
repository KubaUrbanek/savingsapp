package pl.oszczednosci.app.adapter.out.persistence;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;

public final class UnitOfWorkInvestmentOperationRepository implements InvestmentOperationRepository {
    private static final Comparator<InvestmentOperation> NEWEST_FIRST = Comparator
            .comparing(InvestmentOperation::getDate, Comparator.reverseOrder())
            .thenComparing(InvestmentOperation::getCreatedAt, Comparator.reverseOrder());
    private final InvestmentUnitOfWork store;
    public UnitOfWorkInvestmentOperationRepository(InvestmentUnitOfWork store) { this.store = store; }
    @Override public synchronized InvestmentOperation save(InvestmentOperation operation) {
        store.update(current -> {
            if(current.operations().stream().anyMatch(o->o.getId().equals(operation.getId()) && o.getGroupId()!=null)) throw new IllegalArgumentException("Powiązaną zmianę popraw przez historię portfela.");
            List<InvestmentOperation> values = new java.util.ArrayList<>(current.operations());
            values.removeIf(value -> value.getId().equals(operation.getId()));
            values.add(operation);
            return new InvestmentBackup(current.formatVersion(), current.entries(), values, current.plans());
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
            var linked=current.operations().stream().filter(o->o.getId().equals(id.value()) && o.getGroupId()!=null).findFirst();
            if(linked.isPresent()) {
                var group=linked.get().getGroupId();
                var removed=current.operations().stream().filter(o->group.equals(o.getGroupId())).map(InvestmentOperation::getId).collect(java.util.stream.Collectors.toSet());
                var ops=current.operations().stream().filter(o->!removed.contains(o.getId())).toList();
                var entries=current.entries().stream().filter(e->!removed.contains(e.getId())).toList();
                deleted[0]=true;
                return new InvestmentBackup(current.formatVersion(),pl.oszczednosci.app.domain.service.PortfolioChangeCalculator.rebuild(entries,ops),ops,current.plans());
            }
            deleted[0] = values.removeIf(value -> value.id().equals(id));
            return deleted[0] ? new InvestmentBackup(current.formatVersion(), current.entries(), values, current.plans()) : current;
        });
        return deleted[0] ? DeleteResult.DELETED : DeleteResult.NOT_FOUND;
    }
}
