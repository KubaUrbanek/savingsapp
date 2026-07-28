package pl.oszczednosci.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;

public record CreateInvestmentEntryRequest(
        @NotNull InvestmentType type,
        @NotNull PortfolioUser owner,
        InvestmentSubcategory subcategory,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 17, fraction = 2) BigDecimal valuePln,
        @NotNull LocalDate date
) {
}
