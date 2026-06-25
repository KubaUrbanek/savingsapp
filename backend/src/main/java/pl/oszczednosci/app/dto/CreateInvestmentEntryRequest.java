package pl.oszczednosci.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.model.InvestmentType;

public record CreateInvestmentEntryRequest(
        @NotNull InvestmentType type,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 17, fraction = 2) BigDecimal valuePln,
        @NotNull LocalDate date
) {
}
