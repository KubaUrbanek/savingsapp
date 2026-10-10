package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import pl.oszczednosci.app.domain.model.*;
public record RecordPortfolioChangeCommand(UUID requestId, String kind, OwnerId owner,
    InvestmentType type, InvestmentSubcategory subcategory, LocalDate date,
    BigDecimal amountPln, BigDecimal valuePln, InvestmentType cashType) {}
