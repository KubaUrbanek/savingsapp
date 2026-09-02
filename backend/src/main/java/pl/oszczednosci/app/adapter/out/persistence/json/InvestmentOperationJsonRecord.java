package pl.oszczednosci.app.adapter.out.persistence.json;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import pl.oszczednosci.app.domain.model.*;

public record InvestmentOperationJsonRecord(UUID id, InvestmentOperationType operationType, InvestmentType type,
        String owner, InvestmentSubcategory subcategory, BigDecimal amountPln, BigDecimal feePln,
        BigDecimal taxPln, LocalDate date, String note, Instant createdAt) {}
