package pl.oszczednosci.app.adapter.in.web;

import jakarta.validation.constraints.NotNull;
import pl.oszczednosci.app.domain.model.InvestmentType;

public record InvestmentSubcategoriesRequest(@NotNull InvestmentType type) {
}
