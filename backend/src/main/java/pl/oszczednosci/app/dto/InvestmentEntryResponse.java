package pl.oszczednosci.app.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;

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
