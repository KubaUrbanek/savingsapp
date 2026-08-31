package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal; import java.time.LocalDate;
import pl.oszczednosci.app.domain.model.*;
public record CreateInvestmentOperationCommand(InvestmentOperationType operationType, InvestmentType type, PortfolioUser owner, InvestmentSubcategory subcategory, BigDecimal amountPln, BigDecimal feePln, BigDecimal taxPln, LocalDate date, String note) {}
