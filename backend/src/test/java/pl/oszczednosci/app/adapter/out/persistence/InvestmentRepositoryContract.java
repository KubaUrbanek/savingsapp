package pl.oszczednosci.app.adapter.out.persistence;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import pl.oszczednosci.app.application.exception.MalformedImportException;
import pl.oszczednosci.app.application.exception.PersistenceException;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;

/** Reusable behavioral contract; new adapters supply repositories through the factory methods. */
public abstract class InvestmentRepositoryContract {
    protected abstract InvestmentEntryRepository entries();
    protected abstract InvestmentOperationRepository operations();
    protected abstract InvestmentBackupPort backups();
    protected abstract void makeStorageMalformed() throws Exception;
    /** Recreate adapter instances without clearing their durable storage. */
    protected abstract void reloadAdapters();

    protected abstract InvestmentEntry entry(UUID id, java.time.LocalDate date, java.time.Instant created);
    protected abstract InvestmentOperation operation(UUID id, java.time.LocalDate date, java.time.Instant created);

    @Test void entrySaveReloadReplacementOrderingAndMissingDelete() {
        UUID olderId = UUID.randomUUID();
        InvestmentEntry replacement = entry(olderId, java.time.LocalDate.parse("2025-03-01"),
                java.time.Instant.parse("2025-01-01T10:00:00Z"));
        entries().save(entry(olderId, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        entries().save(entry(UUID.randomUUID(), java.time.LocalDate.parse("2025-02-01"), java.time.Instant.parse("2025-02-01T10:00:00Z")));
        entries().save(replacement);
        reloadAdapters();
        List<InvestmentEntry> result = entries().matching(
                InvestmentEntryCriteria.allFor(PortfolioUser.JAKUB));
        assertThat(result).hasSize(2).extracting(InvestmentEntry::getId).first().isEqualTo(olderId);
        assertThatThrownBy(() -> result.clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThat(entries().find(new InvestmentEntryId(olderId))).hasValueSatisfying(reloaded ->
                assertThat(reloaded).usingRecursiveComparison().isEqualTo(replacement));
        assertThat(entries().delete(new InvestmentEntryId(UUID.randomUUID()))).isEqualTo(DeleteResult.NOT_FOUND);
        assertThat(entries().delete(new InvestmentEntryId(olderId))).isEqualTo(DeleteResult.DELETED);
    }

    @Test void operationSaveReloadReplacementOrderingAndMissingDelete() {
        UUID id = UUID.randomUUID();
        InvestmentOperation replacement = operation(id, java.time.LocalDate.parse("2025-02-01"),
                java.time.Instant.parse("2025-01-01T10:00:00Z"));
        operations().save(operation(id, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        operations().save(replacement);
        reloadAdapters();
        List<InvestmentOperation> result = operations().matching(
                InvestmentOperationCriteria.allFor(PortfolioUser.JAKUB));
        assertThat(result).hasSize(1).first().extracting(InvestmentOperation::getDate)
                .isEqualTo(java.time.LocalDate.parse("2025-02-01"));
        assertThatThrownBy(() -> result.clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThat(operations().find(new InvestmentOperationId(id))).hasValueSatisfying(reloaded ->
                assertThat(reloaded).usingRecursiveComparison().isEqualTo(replacement));
        assertThat(operations().delete(new InvestmentOperationId(UUID.randomUUID()))).isEqualTo(DeleteResult.NOT_FOUND);
        assertThat(operations().delete(new InvestmentOperationId(id))).isEqualTo(DeleteResult.DELETED);
        assertThat(operations().find(new InvestmentOperationId(id))).isEmpty();
    }

    @Test void backupReplacementIncludesBothAggregateTypes() {
        UUID retainedEntry = UUID.randomUUID();
        UUID retainedOperation = UUID.randomUUID();
        entries().save(entry(retainedEntry, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));
        operations().save(operation(retainedOperation, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));
        byte[] backup = backups().exportBackup();

        entries().save(entry(UUID.randomUUID(), java.time.LocalDate.parse("2025-02-01"), java.time.Instant.EPOCH));
        operations().delete(new InvestmentOperationId(retainedOperation));
        backups().importBackup(backup);

        assertThat(entries().matching(InvestmentEntryCriteria.allFor(PortfolioUser.JAKUB)))
                .extracting(InvestmentEntry::getId).containsExactly(retainedEntry);
        assertThat(operations().matching(InvestmentOperationCriteria.allFor(PortfolioUser.JAKUB)))
                .extracting(InvestmentOperation::getId).containsExactly(retainedOperation);
    }

    @Test void repositoryQueriesMakeAbsenceAndAssetSelectionExplicit() {
        UUID entryId = UUID.randomUUID();
        UUID operationId = UUID.randomUUID();
        entries().save(entry(entryId, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));
        operations().save(operation(operationId, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));

        assertThat(entries().find(new InvestmentEntryId(UUID.randomUUID()))).isEmpty();
        assertThat(operations().find(new InvestmentOperationId(UUID.randomUUID()))).isEmpty();
        assertThat(entries().matching(InvestmentEntryCriteria.forAsset(PortfolioUser.JAKUB,
                InvestmentType.GIELDA, InvestmentSubcategory.RYNKI_ROZWINIETE)))
                .extracting(InvestmentEntry::getId).containsExactly(entryId);
        assertThat(operations().matching(InvestmentOperationCriteria.forAsset(PortfolioUser.JAKUB,
                InvestmentType.GIELDA, InvestmentSubcategory.RYNKI_ROZWINIETE)))
                .extracting(InvestmentOperation::getId).containsExactly(operationId);
        assertThat(entries().matching(InvestmentEntryCriteria.forAsset(PortfolioUser.JAKUB,
                InvestmentType.GIELDA, InvestmentSubcategory.POLSKA))).isEmpty();
        assertThat(operations().matching(InvestmentOperationCriteria.forAsset(PortfolioUser.JAKUB,
                InvestmentType.GIELDA, InvestmentSubcategory.POLSKA))).isEmpty();
    }

    @Test void malformedImportRollsBackTheCompleteStore() {
        entries().save(entry(UUID.randomUUID(), java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));
        operations().save(operation(UUID.randomUUID(), java.time.LocalDate.parse("2025-01-01"), java.time.Instant.EPOCH));
        byte[] before = backups().exportBackup();

        assertThatThrownBy(() -> backups().importBackup("not-a-backup".getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .isInstanceOf(MalformedImportException.class);
        assertThat(backups().exportBackup()).isEqualTo(before);
    }

    @Test void malformedLiveStorageIsReported() throws Exception {
        makeStorageMalformed();
        assertThatThrownBy(() -> entries().matching(
                InvestmentEntryCriteria.allFor(PortfolioUser.JAKUB)))
                .isInstanceOf(PersistenceException.class);
    }

    @Test void concurrentEntryAndOperationAccessDoesNotLoseUpdates() throws Exception {
        int count = 20;
        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            List<Callable<Void>> tasks = java.util.stream.IntStream.range(0, count).<Callable<Void>>mapToObj(index -> () -> {
                entries().save(entry(UUID.randomUUID(), java.time.LocalDate.of(2025, 1, 1),
                        java.time.Instant.ofEpochSecond(index + 1)));
                operations().save(operation(UUID.randomUUID(), java.time.LocalDate.of(2025, 1, 1),
                        java.time.Instant.ofEpochSecond(index + 1)));
                return null;
            }).toList();
            for (Future<Void> future : executor.invokeAll(tasks)) {
                future.get();
            }
        }
        assertThat(entries().matching(InvestmentEntryCriteria.allFor(PortfolioUser.JAKUB))).hasSize(count);
        assertThat(operations().matching(InvestmentOperationCriteria.allFor(PortfolioUser.JAKUB))).hasSize(count);
    }
}
