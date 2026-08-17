package pl.oszczednosci.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pl.oszczednosci.app.model.InvestmentOperationType;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;

public record CreateInvestmentOperationRequest(
        @NotNull InvestmentOperationType operationType,
        @NotNull InvestmentType type,
        @NotNull PortfolioUser owner,
        InvestmentSubcategory subcategory,
        @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amountPln,
        @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal feePln,
        @DecimalMin("0.00") @Digits(integer = 17, fraction = 2) BigDecimal taxPln,
        @NotNull LocalDate date,
        @Size(max = 250) String note) {
}
