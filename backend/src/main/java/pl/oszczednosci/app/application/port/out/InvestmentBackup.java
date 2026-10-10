package pl.oszczednosci.app.application.port.out;

import java.util.List;
import java.util.Objects;
import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentOperation;

/** Versioned, implementation-independent backup document. */
public record InvestmentBackup(int formatVersion, List<InvestmentEntry> entries,
        List<InvestmentOperation> operations, java.util.Map<String, pl.oszczednosci.app.domain.model.PortfolioPlan> plans) {
    public static final int CURRENT_FORMAT_VERSION = 2;
    public InvestmentBackup {
        if (formatVersion != 1 && formatVersion != CURRENT_FORMAT_VERSION) {
            throw new IllegalArgumentException("Unsupported backup format version: " + formatVersion);
        }
        formatVersion = CURRENT_FORMAT_VERSION;
        plans = java.util.Map.copyOf(Objects.requireNonNull(plans));
        plans.keySet().forEach(InvestmentBackup::validateScope);
        entries = List.copyOf(Objects.requireNonNull(entries, "entries are required"));
        operations = List.copyOf(Objects.requireNonNull(operations, "operations are required"));
    }

    public InvestmentBackup(int version,List<InvestmentEntry> entries,List<InvestmentOperation> operations) { this(version,entries,operations,java.util.Map.of()); }
    public static void validateScope(String scope) {
        if(!"household".equals(scope)) pl.oszczednosci.app.domain.model.OwnerId.of(scope);
    }
    public static InvestmentBackup empty() {
        return new InvestmentBackup(CURRENT_FORMAT_VERSION, List.of(), List.of());
    }
}
