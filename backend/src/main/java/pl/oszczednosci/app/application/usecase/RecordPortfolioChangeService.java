package pl.oszczednosci.app.application.usecase;

import java.time.Instant;
import java.util.*;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.service.PortfolioChangeCalculator;

/** One locked read/validate/write for every side of a portfolio event and its correction. */
public final class RecordPortfolioChangeService implements RecordPortfolioChangeUseCase {
    private final InvestmentUnitOfWork work;
    private final Clock clock;
    private final IdGenerator ids;

    public RecordPortfolioChangeService(InvestmentUnitOfWork work, Clock clock, IdGenerator ids) {
        this.work = work;
        this.clock = clock;
        this.ids = ids;
    }

    public RecordPortfolioChangeResult record(RecordPortfolioChangeCommand command) {
        validate(command);
        RecordPortfolioChangeResult[] result = new RecordPortfolioChangeResult[1];
        work.update(before -> {
            var existing = entry(before, command.requestId());
            if (existing.isPresent()) {
                if (!matches(before, existing.get(), command))
                    throw new IllegalArgumentException("Identyfikator był już użyty dla innej zmiany.");
                result[0] = result(existing.get(), command.kind());
                return before;
            }
            if (operation(before, command.requestId()).isPresent())
                throw new IllegalArgumentException("Identyfikator jest już użyty przez operację.");
            var after = apply(before, command, clock.now(), null, null, null);
            result[0] = result(entry(after, command.requestId()).orElseThrow(), command.kind());
            return after;
        });
        return result[0];
    }

    public RecordPortfolioChangeResult update(UUID id, RecordPortfolioChangeCommand command) {
        validate(command);
        if (!id.equals(command.requestId()))
            throw new IllegalArgumentException("Identyfikator korekty musi odpowiadać poprawianej zmianie.");
        RecordPortfolioChangeResult[] result = new RecordPortfolioChangeResult[1];
        work.update(before -> {
            var oldEntry = entry(before, id);
            var oldOperation = operation(before, id);
            if (oldEntry.isEmpty() && oldOperation.isEmpty()) throw new InvestmentEntryNotFoundException(id);
            var owner = oldOperation.map(InvestmentOperation::owner).orElseGet(() -> oldEntry.orElseThrow().owner());
            var category = oldOperation.map(InvestmentOperation::category).orElseGet(() -> oldEntry.orElseThrow().category());
            if (!owner.equals(command.owner()) || !category.equals(AssetCategory.of(command.type(), command.subcategory())))
                throw new IllegalArgumentException("Korekta nie może przenieść zmiany do innej osoby lub inwestycji.");
            if (oldOperation.isPresent()) {
                var old = oldOperation.get();
                if (old.getGroupId() != null && !id.equals(old.getGroupId()))
                    throw new IllegalArgumentException("Popraw całe zdarzenie, zamiast jego powiązanego salda.");
                if (!old.getOperationType().name().equals(command.kind())
                        && !(old.getOperationType() == InvestmentOperationType.INITIAL && command.kind().equals("VALUATION")))
                    throw new IllegalArgumentException("Korekta musi zachować rodzaj operacji.");
                if (old.getGroupId() == null) {
                    // Independent legacy operations have no generated valuation to reconstruct.
                    var replacement = InvestmentOperation.reconstitute(old.id(), old.getOperationType(), category, owner,
                            new Money(command.amountPln()), old.fee(), old.tax(), command.date(), old.getNote(), old.getCreatedAt());
                    var operations = before.operations().stream().map(o -> o.getId().equals(id) ? replacement : o).toList();
                    var after = new InvestmentBackup(before.formatVersion(), before.entries(), operations, before.plans());
                    result[0] = new RecordPortfolioChangeResult(id,
                            PortfolioChangeCalculator.valueAt(after.entries(), owner, category, command.date()).amount(), command.kind(), true);
                    return after;
                }
            } else if (!Set.of("VALUATION", "INITIAL").contains(command.kind())) {
                throw new IllegalArgumentException("Wycenę można poprawić jako wartość lub stan początkowy.");
            }
            UUID otherId = before.operations().stream()
                    .filter(o -> id.equals(o.getGroupId()) && !id.equals(o.getId())).map(InvestmentOperation::getId).findFirst().orElse(null);
            Instant created = oldEntry.map(InvestmentEntry::createdAt).orElseGet(() -> oldOperation.orElseThrow().getCreatedAt());
            // Insert the replacement before replay; never validate a temporarily deleted initial balance.
            var after = apply(without(before, id), command, created, clock.now(), otherId, before);
            result[0] = result(entry(after, id).orElseThrow(), command.kind());
            return after;
        });
        return result[0];
    }

    public void delete(UUID id) {
        work.update(before -> {
            if (entry(before, id).isEmpty() && operation(before, id).isEmpty()) throw new InvestmentEntryNotFoundException(id);
            var remaining = without(before, id);
            return new InvestmentBackup(before.formatVersion(), PortfolioChangeCalculator.rebuild(remaining.entries(), remaining.operations()),
                    remaining.operations(), before.plans());
        });
    }

    private void validate(RecordPortfolioChangeCommand c) {
        Objects.requireNonNull(c.requestId(), "Request identifier is required");
        if (!Set.of("INITIAL", "VALUATION", "DEPOSIT", "WITHDRAWAL", "BUY", "SELL").contains(c.kind()))
            throw new IllegalArgumentException("Nieznany rodzaj zmiany.");
        if ((c.kind().equals("VALUATION") || c.kind().equals("INITIAL")) && c.valuePln() == null)
            throw new IllegalArgumentException("Podaj aktualną wartość.");
        if (!c.kind().equals("VALUATION") && c.amountPln() == null)
            throw new IllegalArgumentException("Podaj kwotę lub wkład początkowy.");
        if (c.date() == null || c.date().isAfter(clock.today()))
            throw new IllegalArgumentException("Data zmiany nie może być przyszła.");
    }

    private InvestmentBackup apply(InvestmentBackup before, RecordPortfolioChangeCommand c, Instant created, Instant updated, UUID otherId, InvestmentBackup original) {
        var category = AssetCategory.of(c.type(), c.subcategory());
        boolean explicit = c.kind().equals("INITIAL") || c.kind().equals("VALUATION");
        var value = explicit ? new Money(c.valuePln()) : Money.zero();
        if (c.kind().equals("INITIAL") && before.operations().stream().anyMatch(o -> o.owner().equals(c.owner())
                && o.category().equals(category) && o.getOperationType() == InvestmentOperationType.INITIAL))
            throw new IllegalArgumentException("Wkład początkowy jest już zapisany. Użyj „Popraw” w historii.");
        var entries = new ArrayList<>(before.entries());
        var operations = new ArrayList<>(before.operations());
        entries.add(InvestmentEntry.reconstitute(new InvestmentEntryId(c.requestId()), category, c.owner(), value, c.date(), created, updated));
        if (!c.kind().equals("VALUATION")) {
            var kind = InvestmentOperationType.valueOf(c.kind());
            var amount = kind == InvestmentOperationType.INITIAL ? new Money(c.amountPln()) : Money.positive(c.amountPln());
            operations.add(InvestmentOperation.create(new InvestmentOperationId(c.requestId()), kind, category, c.owner(), amount,
                    Money.zero(), Money.zero(), c.date(), null, created).withGroup(c.requestId()));
            if (kind == InvestmentOperationType.BUY || kind == InvestmentOperationType.SELL) {
                if (c.cashType() != InvestmentType.KONTO_BANKOWE && c.cashType() != InvestmentType.KONTO_OSZCZEDNOSCIOWE)
                    throw new IllegalArgumentException("Wybierz konto finansujące zakup lub przyjmujące sprzedaż.");
                var cash = AssetCategory.of(c.cashType(), null);
                if (cash.equals(category)) throw new IllegalArgumentException("Źródło i cel muszą być różne.");
                var opposite = kind == InvestmentOperationType.BUY ? InvestmentOperationType.SELL : InvestmentOperationType.BUY;
                UUID secondary = otherId == null ? ids.nextId() : otherId;
                entries.add(InvestmentEntry.reconstitute(new InvestmentEntryId(secondary), cash, c.owner(), Money.zero(), c.date(), created, updated));
                operations.add(InvestmentOperation.create(new InvestmentOperationId(secondary), opposite, cash, c.owner(), amount,
                        Money.zero(), Money.zero(), c.date(), null, created).withGroup(c.requestId()));
            }
        }
        if (original != null) {
            for (int index = 0; index < operations.size(); index++) {
                var replacement = operations.get(index);
                var previous = operation(original, replacement.getId());
                if (previous.isPresent() && c.requestId().equals(replacement.getGroupId())) {
                    var old = previous.get();
                    operations.set(index, InvestmentOperation.reconstitute(replacement.id(), replacement.getOperationType(),
                            replacement.category(), replacement.owner(), replacement.amount(), old.fee(), old.tax(),
                            replacement.getDate(), old.getNote(), replacement.getCreatedAt()).withGroup(c.requestId()));
                }
            }
        }
        return new InvestmentBackup(before.formatVersion(), PortfolioChangeCalculator.rebuild(entries, operations), operations, before.plans());
    }

    private InvestmentBackup without(InvestmentBackup before, UUID id) {
        var group = operation(before, id).map(InvestmentOperation::getGroupId).orElse(null);
        var removed = new HashSet<UUID>();
        removed.add(id);
        if (group != null) before.operations().stream().filter(o -> group.equals(o.getGroupId())).forEach(o -> removed.add(o.getId()));
        return new InvestmentBackup(before.formatVersion(), before.entries().stream().filter(e -> !removed.contains(e.getId())).toList(),
                before.operations().stream().filter(o -> !removed.contains(o.getId())).toList(), before.plans());
    }

    private Optional<InvestmentEntry> entry(InvestmentBackup backup, UUID id) {
        return backup.entries().stream().filter(e -> e.getId().equals(id)).findFirst();
    }

    private Optional<InvestmentOperation> operation(InvestmentBackup backup, UUID id) {
        return backup.operations().stream().filter(o -> o.getId().equals(id)).findFirst();
    }

    private boolean matches(InvestmentBackup before, InvestmentEntry entry, RecordPortfolioChangeCommand c) {
        var op = operation(before, c.requestId());
        boolean same = entry.owner().equals(c.owner()) && entry.category().equals(AssetCategory.of(c.type(), c.subcategory())) && entry.date().equals(c.date());
        same &= c.kind().equals("VALUATION") ? op.isEmpty() && entry.value().equals(new Money(c.valuePln()))
                : op.isPresent() && op.get().getOperationType().name().equals(c.kind()) && op.get().amount().equals(new Money(c.amountPln()));
        if (c.kind().equals("INITIAL")) same &= entry.value().equals(new Money(c.valuePln()));
        if (c.kind().equals("BUY") || c.kind().equals("SELL")) same &= before.operations().stream()
                .anyMatch(o -> c.requestId().equals(o.getGroupId()) && !o.getId().equals(c.requestId()) && o.getType() == c.cashType());
        return same;
    }

    private RecordPortfolioChangeResult result(InvestmentEntry entry, String kind) {
        return new RecordPortfolioChangeResult(entry.getId(), entry.getValuePln(), kind, true);
    }
}
