package pl.oszczednosci.app.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import pl.oszczednosci.app.dto.PortfolioPerformanceResponse;
import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentOperation;
import pl.oszczednosci.app.model.InvestmentOperationType;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;
import pl.oszczednosci.app.repository.InvestmentOperationRepository;

class InvestmentOperationServiceTest {
    @Test
    void calculatesMonthlyResultWithoutTreatingDepositAsProfit() {
        InvestmentOperationRepository operations = mock(InvestmentOperationRepository.class);
        InvestmentEntryRepository entries = mock(InvestmentEntryRepository.class);
        InvestmentOperationService service = new InvestmentOperationService(operations, entries);
        LocalDate valuationDate = LocalDate.of(2026, 8, 18);
        InvestmentEntry current = new InvestmentEntry(InvestmentType.KONTO_BANKOWE, PortfolioUser.JAKUB, null,
                new BigDecimal("1250"), valuationDate);
        InvestmentEntry opening = new InvestmentEntry(InvestmentType.KONTO_BANKOWE, PortfolioUser.JAKUB, null,
                new BigDecimal("1000"), LocalDate.of(2026, 7, 31));
        current.prepareForSave();
        opening.prepareForSave();
        InvestmentOperation deposit = new InvestmentOperation(null, InvestmentOperationType.DEPOSIT,
                InvestmentType.KONTO_BANKOWE, PortfolioUser.JAKUB, null, new BigDecimal("200"), BigDecimal.ZERO,
                BigDecimal.ZERO, LocalDate.of(2026, 8, 5), null, null);
        deposit.prepareForSave();
        when(operations.findByOwner(PortfolioUser.JAKUB)).thenReturn(List.of(deposit));
        when(entries.findByOwnerOrderByDateDescCreatedAtDesc(PortfolioUser.JAKUB)).thenReturn(List.of(current, opening));

        PortfolioPerformanceResponse result = service.performance(PortfolioUser.JAKUB, null, null, valuationDate);

        assertThat(result.monthlyResultPln()).isEqualByComparingTo("50.00");
        assertThat(result.monthlyReturnRatePercent()).isEqualByComparingTo("4.1667");
    }
}
