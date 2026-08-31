package pl.oszczednosci.app.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InvestmentDomainTest {
    private static final Instant NOW = Instant.parse("2026-08-31T12:00:00Z");

    @Test void moneyOwnsPlnRoundingAndPositiveAmountRules() {
        assertThat(Money.positive(new BigDecimal("12.345")).amount()).isEqualByComparingTo("12.35");
        assertThatThrownBy(() -> Money.positive(BigDecimal.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Money.zeroOrPositive(new BigDecimal("-0.01"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Money.positive(null)).isInstanceOf(NullPointerException.class);
    }

    @Test void incompatibleOrMissingSubcategoryCannotEnterCategory() {
        assertThatThrownBy(() -> AssetCategory.of(InvestmentType.GIELDA, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AssetCategory.of(InvestmentType.KONTO_BANKOWE, InvestmentSubcategory.ZLOTO))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AssetCategory.of(InvestmentType.OBLIGACJE, InvestmentSubcategory.ZLOTO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void entryRejectsEveryMissingRequiredValue() {
        AssetCategory category = AssetCategory.of(InvestmentType.KONTO_BANKOWE, null);
        assertThatThrownBy(() -> InvestmentEntry.create(null, category, PortfolioOwner.of(PortfolioUser.JAKUB),
                Money.positive(BigDecimal.ONE), LocalDate.now(), NOW)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()), category, null,
                Money.positive(BigDecimal.ONE), LocalDate.now(), NOW)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> InvestmentEntry.create(new InvestmentEntryId(UUID.randomUUID()), category,
                PortfolioOwner.of(PortfolioUser.JAKUB), null, LocalDate.now(), NOW)).isInstanceOf(NullPointerException.class);
    }

    @Test void operationRejectsNegativeFeesTaxesAndZeroAmount() {
        AssetCategory category = AssetCategory.of(InvestmentType.KONTO_BANKOWE, null);
        assertThatThrownBy(() -> operation(category, Money.zero(), Money.zero(), Money.zero()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> operation(category, Money.positive(BigDecimal.ONE),
                Money.zeroOrPositive(new BigDecimal("-1")), Money.zero())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> operation(category, Money.positive(BigDecimal.ONE), Money.zero(),
                Money.zeroOrPositive(new BigDecimal("-1")))).isInstanceOf(IllegalArgumentException.class);
    }

    private InvestmentOperation operation(AssetCategory category, Money amount, Money fee, Money tax) {
        return InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()), InvestmentOperationType.DEPOSIT,
                category, PortfolioOwner.of(PortfolioUser.JAKUB), amount, fee, tax, LocalDate.now(), null, NOW);
    }
}
