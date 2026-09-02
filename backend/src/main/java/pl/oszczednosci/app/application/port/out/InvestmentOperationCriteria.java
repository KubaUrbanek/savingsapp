package pl.oszczednosci.app.application.port.out;

import java.util.Optional;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.OwnerId;

public record InvestmentOperationCriteria(OwnerId owner, Optional<InvestmentType> type,
        Optional<InvestmentSubcategory> subcategory) {
    public InvestmentOperationCriteria {
        if (owner == null) throw new IllegalArgumentException("owner is required");
        type = Optional.ofNullable(type).orElseThrow(() -> new IllegalArgumentException("type is required"));
        subcategory = Optional.ofNullable(subcategory)
                .orElseThrow(() -> new IllegalArgumentException("subcategory is required"));
    }

    public static InvestmentOperationCriteria allFor(OwnerId owner) {
        return new InvestmentOperationCriteria(owner, Optional.empty(), Optional.empty());
    }

    public static InvestmentOperationCriteria forAsset(OwnerId owner, InvestmentType type,
            InvestmentSubcategory subcategory) {
        return new InvestmentOperationCriteria(owner, Optional.of(type), Optional.of(subcategory));
    }
}
