package pl.oszczednosci.app.application.port.out;

import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;

public record InvestmentOperationCriteria(PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory) {
    public InvestmentOperationCriteria {
        if (owner == null) throw new IllegalArgumentException("owner is required");
    }
}
