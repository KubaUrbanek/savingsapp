package pl.oszczednosci.app.adapter.in.web;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.OwnerId;

public record CreateInvestmentEntryRequest(
        @NotNull InvestmentType type,
        @NotNull String owner,
        InvestmentSubcategory subcategory,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 17, fraction = 2) BigDecimal valuePln,
        @NotNull LocalDate date
) {
}
