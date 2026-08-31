package pl.oszczednosci.app.adapter.out.persistence.json;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;

public record InvestmentEntryJsonRecord(UUID id, InvestmentType type, PortfolioUser owner,
        InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date, Instant createdAt, Instant updatedAt) {}
