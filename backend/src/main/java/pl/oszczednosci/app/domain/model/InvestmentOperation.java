package pl.oszczednosci.app.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/** Immutable framework-independent cash operation aggregate. */
public final class InvestmentOperation {
    private final InvestmentOperationId id;
    private final InvestmentOperationType operationType;
    private final AssetCategory category;
    private final OwnerId owner;
    private final Money amount;
    private final Money fee;
    private final Money tax;
    private final LocalDate date;
    private final String note;
    private final Instant createdAt;

    private InvestmentOperation(InvestmentOperationId id, InvestmentOperationType operationType, AssetCategory category,
            OwnerId owner, Money amount, Money fee, Money tax, LocalDate date, String note, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "Investment operation id is required");
        this.operationType = Objects.requireNonNull(operationType, "Operation type is required");
        this.category = Objects.requireNonNull(category, "Asset category is required");
        this.owner = Objects.requireNonNull(owner, "Portfolio owner is required");
        this.amount = Objects.requireNonNull(amount, "Operation amount is required");
        if (amount.amount().signum() <= 0) throw new IllegalArgumentException("Operation amount must be positive");
        this.fee = Objects.requireNonNull(fee, "Operation fee is required");
        this.tax = Objects.requireNonNull(tax, "Operation tax is required");
        this.date = Objects.requireNonNull(date, "Operation date is required");
        this.note = normalizeNote(note);
        this.createdAt = Objects.requireNonNull(createdAt, "Creation timestamp is required");
    }

    public static InvestmentOperation create(InvestmentOperationId id, InvestmentOperationType operationType,
            AssetCategory category, OwnerId owner, Money amount, Money fee, Money tax, LocalDate date,
            String note, Instant createdAt) {
        return new InvestmentOperation(id, operationType, category, owner, amount, fee, tax, date, note, createdAt);
    }

    public static InvestmentOperation reconstitute(InvestmentOperationId id, InvestmentOperationType operationType,
            AssetCategory category, OwnerId owner, Money amount, Money fee, Money tax, LocalDate date,
            String note, Instant createdAt) {
        return new InvestmentOperation(id, operationType, category, owner, amount, fee, tax, date, note, createdAt);
    }

    private static String normalizeNote(String note) {
        if (note == null) return null;
        String normalized = note.trim();
        if (normalized.length() > 250) throw new IllegalArgumentException("Operation note cannot exceed 250 characters");
        return normalized.isEmpty() ? null : normalized;
    }

    public InvestmentOperationId id() { return id; }
    public AssetCategory category() { return category; }
    public OwnerId owner() { return owner; }
    public Money amount() { return amount; }
    public Money fee() { return fee; }
    public Money tax() { return tax; }
    public java.util.UUID getId() { return id.value(); }
    public InvestmentOperationType getOperationType() { return operationType; }
    public InvestmentType getType() { return category.type(); }
    public OwnerId getOwner() { return owner; }
    public InvestmentSubcategory getSubcategory() { return category.subcategory(); }
    public java.math.BigDecimal getAmountPln() { return amount.amount(); }
    public java.math.BigDecimal getFeePln() { return fee.amount(); }
    public java.math.BigDecimal getTaxPln() { return tax.amount(); }
    public LocalDate getDate() { return date; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
