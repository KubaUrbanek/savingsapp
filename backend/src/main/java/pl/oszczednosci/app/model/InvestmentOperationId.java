package pl.oszczednosci.app.model;

import java.util.Objects;
import java.util.UUID;

public record InvestmentOperationId(UUID value) {
    public InvestmentOperationId { Objects.requireNonNull(value, "Investment operation id is required"); }
}
