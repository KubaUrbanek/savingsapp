package pl.oszczednosci.app.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.List;

import org.junit.jupiter.api.Test;

import pl.oszczednosci.app.dto.PortfolioPerformanceResponse;
import pl.oszczednosci.app.model.*;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;
import pl.oszczednosci.app.repository.InvestmentOperationRepository;

class InvestmentOperationServiceTest {
    @Test
    void calculatesMonthlyResultWithoutTreatingDepositAsProfit() {
        InvestmentOperationRepository operations = mock(InvestmentOperationRepository.class);
        InvestmentEntryRepository entries = mock(InvestmentEntryRepository.class);
        InvestmentOperationService service = new InvestmentOperationService(operations, entries, UUID::randomUUID, Clock.fixed(Instant.parse("2026-08-31T00:00:00Z"), ZoneOffset.UTC));
        LocalDate valuationDate = LocalDate.of(2026, 8, 18);
        InvestmentEntry current = InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()), AssetCategory.of(InvestmentType.KONTO_BANKOWE, null),
                PortfolioOwner.of(PortfolioUser.JAKUB), Money.positive(new BigDecimal("1250")), valuationDate,
                Instant.parse("2026-08-18T00:00:00Z"));
        InvestmentEntry opening = InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()), AssetCategory.of(InvestmentType.KONTO_BANKOWE, null),
                PortfolioOwner.of(PortfolioUser.JAKUB), Money.positive(new BigDecimal("1000")), LocalDate.of(2026, 7, 31),
                Instant.parse("2026-07-31T00:00:00Z"));
        InvestmentOperation deposit = InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()),
                InvestmentOperationType.DEPOSIT, AssetCategory.of(InvestmentType.KONTO_BANKOWE, null),
                PortfolioOwner.of(PortfolioUser.JAKUB), Money.positive(new BigDecimal("200")), Money.zero(), Money.zero(),
                LocalDate.of(2026, 8, 5), null, Instant.parse("2026-08-05T00:00:00Z"));
        when(operations.findByOwner(PortfolioUser.JAKUB)).thenReturn(List.of(deposit));
        when(entries.findByOwnerOrderByDateDescCreatedAtDesc(PortfolioUser.JAKUB)).thenReturn(List.of(current, opening));

        PortfolioPerformanceResponse result = service.performance(PortfolioUser.JAKUB, null, null, valuationDate);

        assertThat(result.monthlyResultPln()).isEqualByComparingTo("50.00");
        assertThat(result.monthlyReturnRatePercent()).isEqualByComparingTo("4.1667");
    }
}
