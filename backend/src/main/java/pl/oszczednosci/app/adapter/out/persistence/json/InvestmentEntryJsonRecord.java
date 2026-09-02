package pl.oszczednosci.app.adapter.out.persistence.json;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.OwnerId;

public record InvestmentEntryJsonRecord(UUID id, InvestmentType type, String owner,
        InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date, Instant createdAt, Instant updatedAt) {}
