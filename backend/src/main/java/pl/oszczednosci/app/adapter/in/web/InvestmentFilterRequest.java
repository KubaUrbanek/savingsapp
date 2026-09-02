package pl.oszczednosci.app.adapter.in.web;

import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.domain.model.*;

public record InvestmentFilterRequest(@NotNull String owner, InvestmentType type,
        InvestmentSubcategory subcategory) {
}
