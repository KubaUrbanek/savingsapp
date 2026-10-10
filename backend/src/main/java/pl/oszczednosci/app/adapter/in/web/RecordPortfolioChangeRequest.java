package pl.oszczednosci.app.adapter.in.web;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.constraints.*;
import pl.oszczednosci.app.domain.model.*;
public record RecordPortfolioChangeRequest(@NotNull UUID requestId,@NotNull String kind,@NotNull String owner,
    @NotNull InvestmentType type, InvestmentSubcategory subcategory,@NotNull LocalDate date,
    @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal amountPln,
    @DecimalMin("0") @Digits(integer=17,fraction=2) BigDecimal valuePln, InvestmentType cashType) {}
