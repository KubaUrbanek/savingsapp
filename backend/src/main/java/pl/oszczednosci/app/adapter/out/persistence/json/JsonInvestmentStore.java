package pl.oszczednosci.app.adapter.out.persistence.json;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import pl.oszczednosci.app.application.exception.MalformedImportException;
import pl.oszczednosci.app.application.exception.PersistenceException;
import pl.oszczednosci.app.application.port.out.InvestmentBackup;
import pl.oszczednosci.app.application.port.out.InvestmentBackupPort;
import pl.oszczednosci.app.application.port.out.InvestmentUnitOfWork;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** The sole owner of JSON, filesystem and atomic replacement concerns. */
public final class JsonInvestmentStore implements InvestmentUnitOfWork, InvestmentBackupPort {
    private static final TypeReference<List<InvestmentEntryJsonRecord>> LEGACY_ENTRIES = new TypeReference<>() { };
    private final ObjectMapper json;
    private final Path path;
    private final InvestmentEntryJsonMapper entryMapper = new InvestmentEntryJsonMapper();
    private final InvestmentOperationJsonMapper operationMapper = new InvestmentOperationJsonMapper();

    public JsonInvestmentStore(ObjectMapper json, Path path) {
        this.json = json;
        this.path = path.toAbsolutePath();
    }

    @Override public synchronized InvestmentBackup snapshot() {
        if (Files.notExists(path)) return emptyBackup();
        try {
            return parse(Files.readAllBytes(path), false);
        } catch (IOException exception) {
            throw new PersistenceException("Unable to read investment store: " + path, exception);
        }
    }

    @Override public synchronized void replaceAll(InvestmentBackup backup) {
        write(backup); // one atomic replacement is the transaction boundary for both aggregates
    }

    @Override public synchronized void update(java.util.function.UnaryOperator<InvestmentBackup> change) {
        write(change.apply(snapshot()));
    }

    @Override public synchronized byte[] exportBackup() {
        if (Files.notExists(path)) write(emptyBackup());
        try {
            return Files.readAllBytes(path);
        } catch (IOException exception) {
            throw new PersistenceException("Unable to export investment backup: " + path, exception);
        }
    }

    @Override public synchronized void importBackup(byte[] document) {
        InvestmentBackup validated = parse(document.clone(), true);
        write(validated); // nothing is replaced until the complete document has mapped successfully
    }

    private InvestmentBackup parse(byte[] bytes, boolean imported) {
        try {
            JsonNode root = json.readTree(bytes);
            if (root == null) throw new IllegalArgumentException("Backup document is empty");
            if (root.isArray()) { // migration from the entries-only, pre-versioned format
                List<InvestmentEntryJsonRecord> entries = json.readValue(bytes, LEGACY_ENTRIES);
                return backup(entries, List.of());
            }
            InvestmentBackupJsonDocument document = json.readValue(bytes, InvestmentBackupJsonDocument.class);
            if (document.formatVersion() != InvestmentBackup.CURRENT_FORMAT_VERSION) {
                throw new IllegalArgumentException("Unsupported backup format version: " + document.formatVersion());
            }
            if (document.entries() == null || document.operations() == null) {
                throw new IllegalArgumentException("Backup must contain entries and operations");
            }
            return backup(document.entries(), document.operations());
        } catch (RuntimeException exception) {
            if (imported) throw new MalformedImportException("Invalid investment backup document.", exception);
            throw new PersistenceException("Malformed investment store: " + path, exception);
        }
    }

    private InvestmentBackup backup(List<InvestmentEntryJsonRecord> entries,
            List<InvestmentOperationJsonRecord> operations) {
        return new InvestmentBackup(InvestmentBackup.CURRENT_FORMAT_VERSION,
                entries.stream().map(entryMapper::toDomain).toList(),
                operations.stream().map(operationMapper::toDomain).toList());
    }

    private void write(InvestmentBackup backup) {
        Path temporary = null;
        try {
            Files.createDirectories(path.getParent());
            temporary = Files.createTempFile(path.getParent(), path.getFileName().toString(), ".tmp");
            InvestmentBackupJsonDocument document = new InvestmentBackupJsonDocument(backup.formatVersion(),
                    backup.entries().stream().map(entryMapper::toRecord).toList(),
                    backup.operations().stream().map(operationMapper::toRecord).toList());
            json.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), document);
            Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
            throw new PersistenceException("Unable to atomically write investment store: " + path, exception);
        }
    }

    private static InvestmentBackup emptyBackup() {
        return new InvestmentBackup(InvestmentBackup.CURRENT_FORMAT_VERSION, List.of(), List.of());
    }
}
