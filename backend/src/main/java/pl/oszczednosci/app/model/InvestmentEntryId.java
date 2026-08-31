package pl.oszczednosci.app.model;

import java.util.Objects;
import java.util.UUID;

public record InvestmentEntryId(UUID value) {
    public InvestmentEntryId { Objects.requireNonNull(value, "Investment entry id is required"); }
}
