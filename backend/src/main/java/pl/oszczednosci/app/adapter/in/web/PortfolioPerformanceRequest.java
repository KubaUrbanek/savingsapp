package pl.oszczednosci.app.adapter.in.web;

import java.time.LocalDate;
import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.domain.model.*;

public record PortfolioPerformanceRequest(@NotNull String owner, InvestmentType type,
        InvestmentSubcategory subcategory, LocalDate valuationDate) {
    InvestmentFilterRequest filter() { return new InvestmentFilterRequest(owner, type, subcategory); }
}
