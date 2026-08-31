package pl.oszczednosci.app.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/** Framework-independent portfolio valuation aggregate. */
public final class InvestmentEntry {
    private final InvestmentEntryId id;
    private final AssetCategory category;
    private final PortfolioOwner owner;
    private final Money value;
    private final LocalDate date;
    private final Instant createdAt;
    private final Instant updatedAt;

    private InvestmentEntry(InvestmentEntryId id, AssetCategory category, PortfolioOwner owner, Money value,
            LocalDate date, Instant createdAt, Instant updatedAt) {
        this.id = Objects.requireNonNull(id, "Investment entry id is required");
        this.category = Objects.requireNonNull(category, "Asset category is required");
        this.owner = Objects.requireNonNull(owner, "Portfolio owner is required");
        this.value = Objects.requireNonNull(value, "Investment value is required");
        this.date = Objects.requireNonNull(date, "Valuation date is required");
        this.createdAt = Objects.requireNonNull(createdAt, "Creation timestamp is required");
        if (updatedAt != null && updatedAt.isBefore(createdAt))
            throw new IllegalArgumentException("Update timestamp cannot precede creation timestamp");
        this.updatedAt = updatedAt;
    }

    public static InvestmentEntry create(InvestmentEntryId id, AssetCategory category, PortfolioOwner owner,
            Money value, LocalDate date, Instant createdAt) {
        return new InvestmentEntry(id, category, owner, value, date, createdAt, null);
    }

    public static InvestmentEntry reconstitute(InvestmentEntryId id, AssetCategory category, PortfolioOwner owner,
            Money value, LocalDate date, Instant createdAt, Instant updatedAt) {
        return new InvestmentEntry(id, category, owner, value, date, createdAt, updatedAt);
    }

    public InvestmentEntry update(AssetCategory category, PortfolioOwner owner, Money value, LocalDate date, Instant updatedAt) {
        Objects.requireNonNull(updatedAt, "Update timestamp is required");
        if (updatedAt.isBefore(createdAt)) throw new IllegalArgumentException("Update timestamp cannot precede creation timestamp");
        return new InvestmentEntry(id, category, owner, value, date, createdAt, updatedAt);
    }

    public InvestmentEntryId id() { return id; }
    public AssetCategory category() { return category; }
    public PortfolioOwner owner() { return owner; }
    public Money value() { return value; }
    public LocalDate date() { return date; }
    public Instant createdAt() { return createdAt; }
    public Instant updatedAt() { return updatedAt; }

    public java.util.UUID getId() { return id.value(); }
    public InvestmentType getType() { return category.type(); }
    public PortfolioUser getOwner() { return owner.value(); }
    public InvestmentSubcategory getSubcategory() { return category.subcategory(); }
    public java.math.BigDecimal getValuePln() { return value.amount(); }
    public LocalDate getDate() { return date; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
