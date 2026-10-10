package pl.oszczednosci.app.domain.service;
import java.time.LocalDate;
import java.util.*;
import pl.oszczednosci.app.domain.model.*;
/** Actual valuations anchor history; generated event balances are replayed chronologically. */
public final class PortfolioChangeCalculator {
    private PortfolioChangeCalculator() {}
    private static final Comparator<InvestmentEntry> ORDER=Comparator.comparing(InvestmentEntry::date).thenComparing(InvestmentEntry::createdAt).thenComparing(e->e.getId().toString());
    public static Money valueAt(List<InvestmentEntry> entries,OwnerId owner,AssetCategory category,LocalDate date) {
        return entries.stream().filter(e->e.owner().equals(owner) && e.category().equals(category) && !e.date().isAfter(date)).max(ORDER).map(InvestmentEntry::value).orElse(Money.zero());
    }
    public static Money apply(Money previous,InvestmentOperationType kind,Money amount) {
        Money result=(kind==InvestmentOperationType.WITHDRAWAL || kind==InvestmentOperationType.SELL) ? previous.subtract(amount) : previous.add(amount);
        if(result.amount().signum()<0) throw new IllegalArgumentException("Kwota przekracza saldo dostępne w dniu zmiany.");
        return result;
    }
    public static List<InvestmentEntry> rebuild(List<InvestmentEntry> entries,List<InvestmentOperation> operations) {
        Map<UUID,InvestmentOperation> indexed=new HashMap<>();
        operations.stream().filter(o->o.getGroupId()!=null && o.getOperationType()!=InvestmentOperationType.INITIAL).forEach(o->indexed.put(o.getId(),o));
        List<InvestmentEntry> result=new ArrayList<>();
        for(var entry:entries.stream().sorted(ORDER).toList()) {
            var op=indexed.get(entry.getId());
            if(op!=null) {
                Money next=apply(valueAt(result,entry.owner(),entry.category(),entry.date()),op.getOperationType(),op.amount());
                entry=InvestmentEntry.reconstitute(entry.id(),entry.category(),entry.owner(),next,entry.date(),entry.createdAt(),entry.updatedAt());
            }
            result.add(entry);
        }
        return List.copyOf(result);
    }
}
