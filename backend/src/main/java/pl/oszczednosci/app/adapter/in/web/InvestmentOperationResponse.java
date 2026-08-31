package pl.oszczednosci.app.adapter.in.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import pl.oszczednosci.app.domain.model.*;

public record InvestmentOperationResponse(UUID id, InvestmentOperationType operationType,
        InvestmentType type, PortfolioUser owner, InvestmentSubcategory subcategory,
        BigDecimal amountPln, BigDecimal feePln, BigDecimal taxPln, LocalDate date,
        String note, Instant createdAt) {
}
