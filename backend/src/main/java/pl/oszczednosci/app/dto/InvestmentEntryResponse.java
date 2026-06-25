package pl.oszczednosci.app.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentType;

public record InvestmentEntryResponse(
        UUID id,
        InvestmentType type,
        BigDecimal valuePln,
        LocalDate date,
        Instant createdAt
) {
    public static InvestmentEntryResponse fromEntity(InvestmentEntry entry) {
        return new InvestmentEntryResponse(
                entry.getId(),
                entry.getType(),
                entry.getValuePln(),
                entry.getDate(),
                entry.getCreatedAt()
        );
    }
}
