package pl.oszczednosci.app.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;


public class InvestmentOperation {
    private UUID id;
    private InvestmentOperationType operationType;
    private InvestmentType type;
    private PortfolioUser owner;
    private InvestmentSubcategory subcategory;
    private BigDecimal amountPln;
    private BigDecimal feePln;
    private BigDecimal taxPln;
    private LocalDate date;
    private String note;
    private Instant createdAt;

    public InvestmentOperation( UUID id,
             InvestmentOperationType operationType,
             InvestmentType type,
             PortfolioUser owner,
             InvestmentSubcategory subcategory,
             BigDecimal amountPln,
             BigDecimal feePln,
             BigDecimal taxPln,
             LocalDate date,
             String note,
             Instant createdAt) {
        this.id = id;
        this.operationType = operationType;
        this.type = type;
        this.owner = owner;
        this.subcategory = subcategory;
        this.amountPln = amountPln;
        this.feePln = feePln == null ? BigDecimal.ZERO : feePln;
        this.taxPln = taxPln == null ? BigDecimal.ZERO : taxPln;
        this.date = date;
        this.note = note;
        this.createdAt = createdAt;
    }

    public void prepareForSave(Instant now) {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = now;
    }

    public UUID getId() { return id; }
    public InvestmentOperationType getOperationType() { return operationType; }
    public InvestmentType getType() { return type; }
    public PortfolioUser getOwner() { return owner; }
    public InvestmentSubcategory getSubcategory() { return subcategory; }
    public BigDecimal getAmountPln() { return amountPln; }
    public BigDecimal getFeePln() { return feePln; }
    public BigDecimal getTaxPln() { return taxPln; }
    public LocalDate getDate() { return date; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
