package pl.oszczednosci.app.application.port.out;

import java.util.List;
import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentOperation;

/** Versioned, implementation-independent backup document. */
public record InvestmentBackup(int formatVersion, List<InvestmentEntry> entries,
        List<InvestmentOperation> operations) {
    public static final int CURRENT_FORMAT_VERSION = 1;
    public InvestmentBackup {
        entries = List.copyOf(entries);
        operations = List.copyOf(operations);
        if (formatVersion != CURRENT_FORMAT_VERSION) {
            throw new IllegalArgumentException("Unsupported backup format version: " + formatVersion);
        }
    }
}
