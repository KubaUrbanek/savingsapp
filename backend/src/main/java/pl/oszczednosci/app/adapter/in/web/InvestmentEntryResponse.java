package pl.oszczednosci.app.adapter.in.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;

public record InvestmentEntryResponse(
        UUID id,
        InvestmentType type,
        PortfolioUser owner,
        InvestmentSubcategory subcategory,
        BigDecimal valuePln,
        LocalDate date,
        Instant createdAt,
        Instant updatedAt
) {
    public static InvestmentEntryResponse fromEntity(InvestmentEntry entry) {
        return new InvestmentEntryResponse(
                entry.getId(),
                entry.getType(),
                entry.getOwner(),
                entry.getSubcategory(),
                entry.getValuePln(),
                entry.getDate(),
                entry.getCreatedAt(),
                entry.getUpdatedAt()
        );
    }
}
