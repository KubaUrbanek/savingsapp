package pl.oszczednosci.app.application.port.out;

import java.util.Optional;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;

public record InvestmentEntryCriteria(PortfolioUser owner, Optional<InvestmentType> type,
        Optional<InvestmentSubcategory> subcategory) {
    public InvestmentEntryCriteria {
        if (owner == null) throw new IllegalArgumentException("owner is required");
        type = Optional.ofNullable(type).orElseThrow(() -> new IllegalArgumentException("type is required"));
        subcategory = Optional.ofNullable(subcategory)
                .orElseThrow(() -> new IllegalArgumentException("subcategory is required"));
    }

    public static InvestmentEntryCriteria matching(PortfolioUser owner, InvestmentType type,
            InvestmentSubcategory subcategory) {
        return new InvestmentEntryCriteria(owner, Optional.ofNullable(type), Optional.ofNullable(subcategory));
    }
}
