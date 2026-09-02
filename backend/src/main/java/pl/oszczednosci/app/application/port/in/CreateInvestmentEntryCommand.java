package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal; import java.time.LocalDate;
import pl.oszczednosci.app.domain.model.*;
public record CreateInvestmentEntryCommand(InvestmentType type, OwnerId owner, InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date) {}
