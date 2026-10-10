package pl.oszczednosci.app.adapter.out.persistence.json;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
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
    private static final ConcurrentHashMap<Path, ReentrantLock> FILE_LOCKS = new ConcurrentHashMap<>();
    private final ObjectMapper json;
    private final Path path;
    private final ReentrantLock fileLock;
    private final InvestmentEntryJsonMapper entryMapper = new InvestmentEntryJsonMapper();
    private final InvestmentOperationJsonMapper operationMapper = new InvestmentOperationJsonMapper();

    public JsonInvestmentStore(ObjectMapper json, Path path) {
        this.json = Objects.requireNonNull(json, "json is required");
        this.path = Objects.requireNonNull(path, "path is required").toAbsolutePath().normalize();
        this.fileLock = FILE_LOCKS.computeIfAbsent(this.path, ignored -> new ReentrantLock());
    }

    @Override public InvestmentBackup snapshot() {
        return locked(this::read);
    }

    @Override public void replaceAll(InvestmentBackup backup) {
        InvestmentBackup validated = Objects.requireNonNull(backup, "backup is required");
        validate(validated);
        locked(() -> write(validated));
    }

    @Override public void update(java.util.function.UnaryOperator<InvestmentBackup> change) {
        Objects.requireNonNull(change, "change is required");
        locked(() -> {
            InvestmentBackup changed = Objects.requireNonNull(change.apply(read()), "change must return a backup");
            validate(changed);
            write(changed);
        });
    }

    @Override public byte[] exportBackup() {
        return locked(() -> serialize(read()));
    }

    @Override public void importBackup(byte[] document) {
        Objects.requireNonNull(document, "document is required");
        InvestmentBackup validated = parse(document.clone(), true);
        locked(() -> write(validated)); // validation finishes before the live document is locked and replaced
    }

    private InvestmentBackup read() {
        if (Files.notExists(path)) return emptyBackup();
        try {
            return parse(Files.readAllBytes(path), false);
        } catch (IOException exception) {
            throw new PersistenceException("Unable to read investment store: " + path, exception);
        }
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
            throw new PersistenceException("Malformed investment store: " + path, exception);
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

    /** Validate collection-wide invariants, not merely the shape of each JSON record. */
    private void validate(InvestmentBackup backup) {
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

    private void validateGroups(InvestmentBackup backup) {
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

    private void write(InvestmentBackup backup) {
        Path temporary = null;
        try {
            Files.createDirectories(path.getParent());
            temporary = Files.createTempFile(path.getParent(), path.getFileName().toString(), ".tmp");
            InvestmentBackupJsonDocument document = new InvestmentBackupJsonDocument(backup.formatVersion(),
                    backup.entries().stream().map(entryMapper::toRecord).toList(),
                    backup.operations().stream().map(operationMapper::toRecord).toList(), backup.plans().entrySet().stream().collect(java.util.stream.Collectors.toMap(java.util.Map.Entry::getKey,e->PortfolioPlanJsonRecord.from(e.getValue()))));
            json.writerWithDefaultPrettyPrinter().writeValue(temporary.toFile(), document);
            Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) { }
            throw new PersistenceException("Unable to atomically write investment store: " + path, exception);
        }
    }

    private byte[] serialize(InvestmentBackup backup) {
        try {
            InvestmentBackupJsonDocument document = new InvestmentBackupJsonDocument(backup.formatVersion(),
                    backup.entries().stream().map(entryMapper::toRecord).toList(),
                    backup.operations().stream().map(operationMapper::toRecord).toList(), backup.plans().entrySet().stream().collect(java.util.stream.Collectors.toMap(java.util.Map.Entry::getKey,e->PortfolioPlanJsonRecord.from(e.getValue()))));
            return json.writerWithDefaultPrettyPrinter().writeValueAsBytes(document);
        } catch (RuntimeException exception) {
            throw new PersistenceException("Unable to export investment backup: " + path, exception);
        }
    }

    private <T> T locked(java.util.function.Supplier<T> action) {
        fileLock.lock();
        try { return action.get(); } finally { fileLock.unlock(); }
    }

    private void locked(Runnable action) {
        locked(() -> { action.run(); return null; });
    }

    private static InvestmentBackup emptyBackup() {
        return InvestmentBackup.empty();
    }
}
