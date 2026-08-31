package pl.oszczednosci.app.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.model.*;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;

class InvestmentEntryServiceTest {

    @Test
    void updatesAnExistingEntryAndMarksItsModificationTime() {
        InvestmentEntryRepository repository = mock(InvestmentEntryRepository.class);
        InvestmentTypePolicyRegistry policies = mock(InvestmentTypePolicyRegistry.class);
        InvestmentTypePolicy policy = mock(InvestmentTypePolicy.class);
        InvestmentEntryService service = new InvestmentEntryService(repository, policies, UUID::randomUUID, Clock.fixed(Instant.parse("2026-08-31T12:00:00Z"), ZoneOffset.UTC));
        InvestmentEntry existing = InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()),
                AssetCategory.of(InvestmentType.GIELDA, InvestmentSubcategory.ZLOTO),
                PortfolioOwner.of(PortfolioUser.JAKUB), Money.positive(new BigDecimal("100.00")),
                LocalDate.of(2026, 8, 1), Instant.parse("2026-08-01T00:00:00Z"));
        UUID id = existing.getId();
        CreateInvestmentEntryRequest request = new CreateInvestmentEntryRequest(
                InvestmentType.GIELDA,
                PortfolioUser.JAKUB,
                InvestmentSubcategory.RYNKI_ROZWINIETE,
                new BigDecimal("250.129"),
                LocalDate.of(2026, 8, 17)
        );

        when(repository.findById(id)).thenReturn(Optional.of(existing));
        when(policies.forType(InvestmentType.GIELDA)).thenReturn(policy);
        when(policy.normalizePln(request.valuePln())).thenReturn(new BigDecimal("250.13"));
        when(repository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        InvestmentEntry updated = service.update(id, request);

        assertThat(updated.getId()).isEqualTo(id);
        assertThat(updated.getSubcategory()).isEqualTo(InvestmentSubcategory.RYNKI_ROZWINIETE);
        assertThat(updated.getValuePln()).isEqualByComparingTo("250.13");
        assertThat(updated.getDate()).isEqualTo(LocalDate.of(2026, 8, 17));
        assertThat(updated.getUpdatedAt()).isNotNull();
        verify(repository).save(updated);
    }

    @Test
    void returnsNotFoundWhenUpdatingAMissingEntry() {
        InvestmentEntryRepository repository = mock(InvestmentEntryRepository.class);
        InvestmentTypePolicyRegistry policies = mock(InvestmentTypePolicyRegistry.class);
        InvestmentEntryService service = new InvestmentEntryService(repository, policies, UUID::randomUUID, Clock.fixed(Instant.parse("2026-08-31T12:00:00Z"), ZoneOffset.UTC));
        UUID id = UUID.randomUUID();
        CreateInvestmentEntryRequest request = new CreateInvestmentEntryRequest(
                InvestmentType.KONTO_BANKOWE,
                PortfolioUser.ZOSIA,
                null,
                new BigDecimal("10.00"),
                LocalDate.of(2026, 8, 17)
        );
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(id, request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
