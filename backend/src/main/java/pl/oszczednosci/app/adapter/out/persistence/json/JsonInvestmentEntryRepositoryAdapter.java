package pl.oszczednosci.app.adapter.out.persistence.json;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import pl.oszczednosci.app.application.port.out.InvestmentDatabaseStorage;
import pl.oszczednosci.app.application.port.out.InvestmentEntryRepository;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DatabindException;
import tools.jackson.databind.ObjectMapper;

import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;

public final class JsonInvestmentEntryRepositoryAdapter implements InvestmentEntryRepository, InvestmentDatabaseStorage {

    private static final TypeReference<List<InvestmentEntry>> ENTRY_LIST = new TypeReference<>() {
    };
    private static final Comparator<InvestmentEntry> NEWEST_FIRST = Comparator
            .comparing(InvestmentEntry::getDate, Comparator.reverseOrder())
            .thenComparing(InvestmentEntry::getCreatedAt, Comparator.reverseOrder());

    private final ObjectMapper objectMapper;
    private final Path databasePath;

    public JsonInvestmentEntryRepositoryAdapter(
            ObjectMapper objectMapper,
            Path databasePath
    ) {
        this.objectMapper = objectMapper;
        this.databasePath = databasePath;
    }

    public synchronized InvestmentEntry save(InvestmentEntry entry) {
        List<InvestmentEntry> entries = readEntries();
        entries.removeIf(existing -> existing.getId().equals(entry.getId()));
        entries.add(entry);
        writeEntries(entries);
        return entry;
    }


    public synchronized byte[] exportDatabase() {
        if (Files.notExists(databasePath)) {
            writeEntries(Collections.emptyList());
        }
        try {
            return Files.readAllBytes(databasePath);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to export JSON database file: " + databasePath, exception);
        }
    }

    public synchronized void importDatabase(byte[] databaseContents) {
        List<InvestmentEntry> entries = parseEntries(databaseContents);
        writeEntries(entries);
    }

    public synchronized void deleteById(UUID id) {
        List<InvestmentEntry> entries = readEntries();
        boolean removed = entries.removeIf(entry -> entry.getId().equals(id));
        if (removed) {
            writeEntries(entries);
        }
    }

    public synchronized Optional<InvestmentEntry> findById(UUID id) {
        return readEntries().stream()
                .filter(entry -> entry.getId().equals(id))
                .findFirst();
    }

    private synchronized List<InvestmentEntry> findByOwnerAndTypeOrderByDateDescCreatedAtDesc(PortfolioUser owner, InvestmentType type) {
        return readEntries().stream()
                .filter(entry -> entry.getOwner() == owner)
                .filter(entry -> entry.getType() == type)
                .sorted(NEWEST_FIRST)
                .toList();
    }

    private synchronized List<InvestmentEntry> findByOwnerAndTypeAndSubcategoryOrderByDateDescCreatedAtDesc(
            PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory
    ) {
        return readEntries().stream()
                .filter(entry -> entry.getOwner() == owner)
                .filter(entry -> entry.getType() == type)
                .filter(entry -> entry.getSubcategory() == subcategory)
                .sorted(NEWEST_FIRST)
                .toList();
    }

    public synchronized List<InvestmentEntry> findByOwner(PortfolioUser owner) {
        return readEntries().stream()
                .filter(entry -> entry.getOwner() == owner)
                .sorted(NEWEST_FIRST)
                .toList();
    }

    private List<InvestmentEntry> readEntries() {
        if (Files.notExists(databasePath)) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(objectMapper.readValue(databasePath.toFile(), ENTRY_LIST));
        } catch (DatabindException exception) {
            throw new IllegalStateException("Unable to read JSON database file: " + databasePath, exception);
        }
    }

    private List<InvestmentEntry> parseEntries(byte[] databaseContents) {
        try {
            return new ArrayList<>(objectMapper.readValue(databaseContents, ENTRY_LIST));
        } catch (DatabindException exception) {
            throw new IllegalArgumentException("Imported file is not a valid investment entries JSON database.", exception);
        }
    }

    private void writeEntries(List<InvestmentEntry> entries) {
        try {
            Path parent = databasePath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Path temporaryFile = Files.createTempFile(parent, databasePath.getFileName().toString(), ".tmp");
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(temporaryFile.toFile(), entries);
            Files.move(temporaryFile, databasePath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to write JSON database file: " + databasePath, exception);
        }
    }
}
