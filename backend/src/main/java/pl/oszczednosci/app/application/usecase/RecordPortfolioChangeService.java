package pl.oszczednosci.app.application.usecase;
import java.util.*;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.service.PortfolioChangeCalculator;

/** One locked read/validate/write for both sides of a portfolio event. */
public final class RecordPortfolioChangeService implements RecordPortfolioChangeUseCase {
    private final InvestmentUnitOfWork work;
    private final Clock clock;
    private final IdGenerator ids;
    public RecordPortfolioChangeService(InvestmentUnitOfWork work, Clock clock, IdGenerator ids) { this.work=work; this.clock=clock; this.ids=ids; }
    public RecordPortfolioChangeResult record(RecordPortfolioChangeCommand c) {
        Objects.requireNonNull(c.requestId(), "Request identifier is required");
        if(!Set.of("INITIAL","VALUATION","DEPOSIT","WITHDRAWAL","BUY","SELL").contains(c.kind())) throw new IllegalArgumentException("Nieznany rodzaj zmiany.");
        if((c.kind().equals("VALUATION") || c.kind().equals("INITIAL")) && c.valuePln()==null) throw new IllegalArgumentException("Podaj aktualną wartość.");
        if(!c.kind().equals("VALUATION") && c.amountPln()==null) throw new IllegalArgumentException("Podaj kwotę lub koszt początkowy.");
        if(c.date()==null || c.date().isAfter(clock.today())) throw new IllegalArgumentException("Data zmiany nie może być przyszła.");
        RecordPortfolioChangeResult[] result = new RecordPortfolioChangeResult[1];
        work.update(before -> {
            var existing=before.entries().stream().filter(e->e.getId().equals(c.requestId())).findFirst();
            if(existing.isPresent()) {
                var entry=existing.get();
                var op=before.operations().stream().filter(o->o.getId().equals(c.requestId())).findFirst();
                boolean matches=entry.owner().equals(c.owner()) && entry.category().equals(AssetCategory.of(c.type(),c.subcategory())) && entry.date().equals(c.date());
                matches &= c.kind().equals("VALUATION") ? op.isEmpty() && entry.value().equals(new Money(c.valuePln())) : op.isPresent() && op.get().getOperationType().name().equals(c.kind()) && op.get().amount().equals(new Money(c.amountPln()));
                if(c.kind().equals("INITIAL")) matches &= entry.value().equals(new Money(c.valuePln()));
                if(c.kind().equals("BUY") || c.kind().equals("SELL")) matches &= before.operations().stream().anyMatch(o->c.requestId().equals(o.getGroupId()) && !o.getId().equals(c.requestId()) && o.getType()==c.cashType());
                if(!matches) throw new IllegalArgumentException("Identyfikator był już użyty dla innej zmiany.");
                result[0]=new RecordPortfolioChangeResult(c.requestId(),entry.getValuePln(),c.kind(),true);
                return before;
            }
            var entries=new ArrayList<>(before.entries());
            var operations=new ArrayList<>(before.operations());
            var category=AssetCategory.of(c.type(),c.subcategory());
            var now=clock.now();
            var previous=PortfolioChangeCalculator.valueAt(entries,c.owner(),category,c.date());
            Money next;
            if(c.kind().equals("VALUATION") || c.kind().equals("INITIAL")) next=new Money(c.valuePln());
            else next=PortfolioChangeCalculator.apply(previous, InvestmentOperationType.valueOf(c.kind()), Money.positive(c.amountPln()));
            if(c.kind().equals("INITIAL") && operations.stream().anyMatch(o->o.owner().equals(c.owner()) && o.category().equals(category) && o.getOperationType()==InvestmentOperationType.INITIAL))
                throw new IllegalArgumentException("Koszt początkowy jest już zapisany. Cofnij poprzedni stan początkowy, aby go poprawić.");
            entries.add(InvestmentEntry.create(new InvestmentEntryId(c.requestId()),category,c.owner(),next,c.date(),now));
            if(!c.kind().equals("VALUATION")) {
                var kind=InvestmentOperationType.valueOf(c.kind());
                var amount=kind==InvestmentOperationType.INITIAL ? new Money(c.amountPln()) : Money.positive(c.amountPln());
                operations.add(InvestmentOperation.create(new InvestmentOperationId(c.requestId()),kind,category,c.owner(),amount,Money.zero(),Money.zero(),c.date(),null,now).withGroup(c.requestId()));
                if(kind==InvestmentOperationType.BUY || kind==InvestmentOperationType.SELL) {
                    if(c.cashType()!=InvestmentType.KONTO_BANKOWE && c.cashType()!=InvestmentType.KONTO_OSZCZEDNOSCIOWE)
                        throw new IllegalArgumentException("Wybierz konto finansujące zakup lub przyjmujące sprzedaż.");
                    var cash=AssetCategory.of(c.cashType(),null);
                    if(cash.equals(category)) throw new IllegalArgumentException("Źródło i cel muszą być różne.");
                    var otherKind=kind==InvestmentOperationType.BUY ? InvestmentOperationType.SELL : InvestmentOperationType.BUY;
                    var cashNext=PortfolioChangeCalculator.apply(PortfolioChangeCalculator.valueAt(before.entries(),c.owner(),cash,c.date()),otherKind,amount);
                    UUID other=ids.nextId();
                    entries.add(InvestmentEntry.create(new InvestmentEntryId(other),cash,c.owner(),cashNext,c.date(),now));
                    operations.add(InvestmentOperation.create(new InvestmentOperationId(other),otherKind,cash,c.owner(),amount,Money.zero(),Money.zero(),c.date(),null,now).withGroup(c.requestId()));
                }
            }
            entries=new ArrayList<>(PortfolioChangeCalculator.rebuild(entries,operations));
            result[0]=new RecordPortfolioChangeResult(c.requestId(),next.amount(),c.kind(),true);
            return new InvestmentBackup(before.formatVersion(),entries,operations,before.plans());
        });
        return result[0];
    }
    public void delete(UUID id) {
        work.update(before -> {
            var op=before.operations().stream().filter(o->o.getId().equals(id)).findFirst();
            var group=op.map(InvestmentOperation::getGroupId).orElse(null);
            var removed=new HashSet<UUID>(); removed.add(id);
            if(group!=null) before.operations().stream().filter(o->group.equals(o.getGroupId())).forEach(o->removed.add(o.getId()));
            if(before.entries().stream().noneMatch(e->removed.contains(e.getId())) && op.isEmpty()) throw new InvestmentEntryNotFoundException(id);
            var operations=before.operations().stream().filter(o->!removed.contains(o.getId())).toList();
            var entries=before.entries().stream().filter(e->!removed.contains(e.getId())).toList();
            return new InvestmentBackup(before.formatVersion(), PortfolioChangeCalculator.rebuild(entries,operations),operations,before.plans());
        });
    }
}
