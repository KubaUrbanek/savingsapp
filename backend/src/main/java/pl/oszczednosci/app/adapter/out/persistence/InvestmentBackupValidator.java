package pl.oszczednosci.app.adapter.out.persistence;

import java.util.HashSet;
import pl.oszczednosci.app.application.port.out.InvestmentBackup;

public final class InvestmentBackupValidator {
    private InvestmentBackupValidator() {}
    /** Validate collection-wide invariants, not merely the shape of each JSON record. */
    public static void validate(InvestmentBackup backup) {
        var entryIds = new HashSet<>();
        if (!backup.entries().stream().allMatch(entry -> entryIds.add(entry.id()))) {
            throw new IllegalArgumentException("Backup contains duplicate investment entry identifiers");
        }
        var operationIds = new HashSet<>();
        if (!backup.operations().stream().allMatch(operation -> operationIds.add(operation.id()))) {
            throw new IllegalArgumentException("Backup contains duplicate investment operation identifiers");
        }
        validateGroups(backup);
    }

    private static void validateGroups(InvestmentBackup backup) {
        var groups=backup.operations().stream().filter(o->o.getGroupId()!=null).collect(java.util.stream.Collectors.groupingBy(pl.oszczednosci.app.domain.model.InvestmentOperation::getGroupId));
        for(var group:groups.entrySet()) {
            var primary=group.getValue().stream().filter(o->o.getId().equals(group.getKey())).findFirst().orElseThrow(()->new IllegalArgumentException("Missing primary portfolio event"));
            boolean trade=primary.getOperationType()==pl.oszczednosci.app.domain.model.InvestmentOperationType.BUY || primary.getOperationType()==pl.oszczednosci.app.domain.model.InvestmentOperationType.SELL;
            if(group.getValue().size()!=(trade?2:1)) throw new IllegalArgumentException("Invalid number of event legs");
            for(var operation:group.getValue()) {
                var entry=backup.entries().stream().filter(e->e.getId().equals(operation.getId())).findFirst().orElseThrow(()->new IllegalArgumentException("Missing linked event valuation"));
                if(!entry.owner().equals(operation.owner()) || !entry.category().equals(operation.category()) || !entry.date().equals(operation.getDate())) throw new IllegalArgumentException("Event and valuation must describe the same asset and date");
                if(!primary.owner().equals(operation.owner()) || !primary.getDate().equals(operation.getDate()) || !primary.amount().equals(operation.amount())) throw new IllegalArgumentException("Event legs must match");
                if (trade && !primary.getId().equals(operation.getId())) {
                    var opposite = primary.getOperationType() == pl.oszczednosci.app.domain.model.InvestmentOperationType.BUY
                            ? pl.oszczednosci.app.domain.model.InvestmentOperationType.SELL
                            : pl.oszczednosci.app.domain.model.InvestmentOperationType.BUY;
                    boolean cash = operation.getType() == pl.oszczednosci.app.domain.model.InvestmentType.KONTO_BANKOWE
                            || operation.getType() == pl.oszczednosci.app.domain.model.InvestmentType.KONTO_OSZCZEDNOSCIOWE;
                    if (operation.getOperationType() != opposite || !cash || primary.category().equals(operation.category()))
                        throw new IllegalArgumentException("Transfer legs must be opposite and use a different cash account");
                }
            }
        }
    }

}
