package pl.oszczednosci.app.adapter.out.persistence.json;

import java.util.List;
import pl.oszczednosci.app.application.exception.*;
import pl.oszczednosci.app.application.port.out.InvestmentBackup;
import static pl.oszczednosci.app.adapter.out.persistence.InvestmentBackupValidator.validate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** JSON boundary shared by backups and one-time legacy migration. */
public final class InvestmentBackupJsonCodec {
    private static final TypeReference<List<InvestmentEntryJsonRecord>> LEGACY_ENTRIES = new TypeReference<>() {};
    private final ObjectMapper json;
    private final InvestmentEntryJsonMapper entryMapper = new InvestmentEntryJsonMapper();
    private final InvestmentOperationJsonMapper operationMapper = new InvestmentOperationJsonMapper();
    public InvestmentBackupJsonCodec(ObjectMapper json) { this.json = json; }
    public InvestmentBackup parse(byte[] bytes, boolean imported) {
        try {
            JsonNode root = json.readTree(bytes);
            if (root == null) throw new IllegalArgumentException("Backup document is empty");
            if (root.isArray()) { // migration from the entries-only, pre-versioned format
                List<InvestmentEntryJsonRecord> entries = json.readValue(bytes, LEGACY_ENTRIES);
                return backup(entries, List.of());
            }
            InvestmentBackupJsonDocument document = json.readValue(bytes, InvestmentBackupJsonDocument.class);
            if (document.formatVersion() != 1 && document.formatVersion() != InvestmentBackup.CURRENT_FORMAT_VERSION) {
                throw new IllegalArgumentException("Unsupported backup format version: " + document.formatVersion());
            }
            if (document.entries() == null || document.operations() == null) {
                throw new IllegalArgumentException("Backup must contain entries and operations");
            }
            var parsed=backup(document.entries(), document.operations());
            if(document.formatVersion()==2 && document.plans()==null) throw new IllegalArgumentException("Backup must contain plans");
            var plans=document.plans()==null ? java.util.Map.<String,pl.oszczednosci.app.domain.model.PortfolioPlan>of() : document.plans().entrySet().stream().collect(java.util.stream.Collectors.toMap(java.util.Map.Entry::getKey,e->e.getValue().toDomain()));
            return new InvestmentBackup(InvestmentBackup.CURRENT_FORMAT_VERSION,parsed.entries(),parsed.operations(),plans);
        } catch (RuntimeException exception) {
            if (imported) throw new MalformedImportException("Invalid investment backup document.", exception);
            throw new PersistenceException("Malformed investment document", exception);
        }
    }

    private InvestmentBackup backup(List<InvestmentEntryJsonRecord> entries,
            List<InvestmentOperationJsonRecord> operations) {
        InvestmentBackup backup = new InvestmentBackup(InvestmentBackup.CURRENT_FORMAT_VERSION,
                entries.stream().map(entryMapper::toDomain).toList(),
                operations.stream().map(operationMapper::toDomain).toList());
        validate(backup);
        return backup;
    }

    public byte[] serialize(InvestmentBackup backup) {
        try {
            InvestmentBackupJsonDocument document = new InvestmentBackupJsonDocument(backup.formatVersion(),
                    backup.entries().stream().map(entryMapper::toRecord).toList(),
                    backup.operations().stream().map(operationMapper::toRecord).toList(), backup.plans().entrySet().stream().collect(java.util.stream.Collectors.toMap(java.util.Map.Entry::getKey,e->PortfolioPlanJsonRecord.from(e.getValue()))));
            return json.writerWithDefaultPrettyPrinter().writeValueAsBytes(document);
        } catch (RuntimeException exception) {
            throw new PersistenceException("Unable to export investment backup", exception);
        }
    }

}
