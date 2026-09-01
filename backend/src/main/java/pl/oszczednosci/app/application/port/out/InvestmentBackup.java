package pl.oszczednosci.app.application.port.out;

import java.util.List;
import java.util.Objects;
import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentOperation;

/** Versioned, implementation-independent backup document. */
public record InvestmentBackup(int formatVersion, List<InvestmentEntry> entries,
        List<InvestmentOperation> operations) {
    public static final int CURRENT_FORMAT_VERSION = 1;
    public InvestmentBackup {
        if (formatVersion != CURRENT_FORMAT_VERSION) {
            throw new IllegalArgumentException("Unsupported backup format version: " + formatVersion);
        }
        entries = List.copyOf(Objects.requireNonNull(entries, "entries are required"));
        operations = List.copyOf(Objects.requireNonNull(operations, "operations are required"));
    }

    public static InvestmentBackup empty() {
        return new InvestmentBackup(CURRENT_FORMAT_VERSION, List.of(), List.of());
    }
}
