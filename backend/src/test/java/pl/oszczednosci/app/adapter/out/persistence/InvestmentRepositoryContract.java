package pl.oszczednosci.app.adapter.out.persistence;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;

/** Reusable behavioral contract; new adapters supply repositories through the factory methods. */
public abstract class InvestmentRepositoryContract {
    protected abstract InvestmentEntryRepository entries();
    protected abstract InvestmentOperationRepository operations();

    protected abstract InvestmentEntry entry(UUID id, java.time.LocalDate date, java.time.Instant created);
    protected abstract InvestmentOperation operation(UUID id, java.time.LocalDate date, java.time.Instant created);

    @Test void entrySaveReloadReplacementOrderingAndMissingDelete() {
        UUID olderId = UUID.randomUUID();
        entries().save(entry(olderId, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        entries().save(entry(UUID.randomUUID(), java.time.LocalDate.parse("2025-02-01"), java.time.Instant.parse("2025-02-01T10:00:00Z")));
        entries().save(entry(olderId, java.time.LocalDate.parse("2025-03-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        List<InvestmentEntry> result = entries().matching(
                InvestmentEntryCriteria.matching(PortfolioUser.JAKUB, null, null));
        assertThat(result).hasSize(2).extracting(InvestmentEntry::getId).first().isEqualTo(olderId);
        assertThatThrownBy(() -> result.clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThat(entries().find(new InvestmentEntryId(olderId))).isPresent();
        assertThat(entries().delete(new InvestmentEntryId(UUID.randomUUID()))).isEqualTo(DeleteResult.NOT_FOUND);
        assertThat(entries().delete(new InvestmentEntryId(olderId))).isEqualTo(DeleteResult.DELETED);
    }

    @Test void operationSaveReloadReplacementOrderingAndMissingDelete() {
        UUID id = UUID.randomUUID();
        operations().save(operation(id, java.time.LocalDate.parse("2025-01-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        operations().save(operation(id, java.time.LocalDate.parse("2025-02-01"), java.time.Instant.parse("2025-01-01T10:00:00Z")));
        List<InvestmentOperation> result = operations().matching(
                InvestmentOperationCriteria.matching(PortfolioUser.JAKUB, null, null));
        assertThat(result).hasSize(1).first().extracting(InvestmentOperation::getDate)
                .isEqualTo(java.time.LocalDate.parse("2025-02-01"));
        assertThatThrownBy(() -> result.clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThat(operations().find(new InvestmentOperationId(id))).isPresent();
        assertThat(operations().delete(new InvestmentOperationId(UUID.randomUUID()))).isEqualTo(DeleteResult.NOT_FOUND);
    }
}
