package pl.oszczednosci.app.adapter.in.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.OwnerId;

public record InvestmentEntryResponse(
        UUID id,
        InvestmentType type,
        String owner,
        InvestmentSubcategory subcategory,
        BigDecimal valuePln,
        LocalDate date,
        Instant createdAt,
        Instant updatedAt
) {
}
