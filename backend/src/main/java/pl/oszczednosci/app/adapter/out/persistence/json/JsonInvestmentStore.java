package pl.oszczednosci.app.adapter.out.persistence.json;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import static pl.oszczednosci.app.adapter.out.persistence.InvestmentBackupValidator.validate;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import pl.oszczednosci.app.application.exception.PersistenceException;
import pl.oszczednosci.app.application.port.out.InvestmentBackup;
import pl.oszczednosci.app.application.port.out.InvestmentBackupPort;
import pl.oszczednosci.app.application.port.out.InvestmentUnitOfWork;
import tools.jackson.databind.ObjectMapper;

/** The sole owner of JSON, filesystem and atomic replacement concerns. */
public final class JsonInvestmentStore implements InvestmentUnitOfWork, InvestmentBackupPort {
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
        return locked(() -> new InvestmentBackupJsonCodec(json).serialize(read()));
    }

    @Override public void importBackup(byte[] document) {
        Objects.requireNonNull(document, "document is required");
        InvestmentBackup validated = new InvestmentBackupJsonCodec(json).parse(document.clone(), true);
        locked(() -> write(validated)); // validation finishes before the live document is locked and replaced
    }

    private InvestmentBackup read() {
        if (Files.notExists(path)) return emptyBackup();
        try {
            return new InvestmentBackupJsonCodec(json).parse(Files.readAllBytes(path), false);
        } catch (IOException exception) {
            throw new PersistenceException("Unable to read investment store: " + path, exception);
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
