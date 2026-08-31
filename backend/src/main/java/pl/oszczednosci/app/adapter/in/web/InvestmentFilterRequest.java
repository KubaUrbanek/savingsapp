package pl.oszczednosci.app.adapter.in.web;

import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.domain.model.*;

public record InvestmentFilterRequest(@NotNull PortfolioUser owner, InvestmentType type,
        InvestmentSubcategory subcategory) {
}
