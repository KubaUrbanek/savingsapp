package pl.oszczednosci.app.application.port.in;
import pl.oszczednosci.app.domain.model.*;
public record InvestmentFilter(OwnerId owner, InvestmentType type, InvestmentSubcategory subcategory) {}
