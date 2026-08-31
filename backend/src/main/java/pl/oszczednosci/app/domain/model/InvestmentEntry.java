package pl.oszczednosci.app.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;


public class InvestmentEntry {

    private UUID id;
    private InvestmentType type;
    private PortfolioUser owner;
    private InvestmentSubcategory subcategory;
    private BigDecimal valuePln;
    private LocalDate date;
    private Instant createdAt;
    private Instant updatedAt;

    public InvestmentEntry(
            UUID id,
            InvestmentType type,
            PortfolioUser owner,
            InvestmentSubcategory subcategory,
            BigDecimal valuePln,
            LocalDate date,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.type = type;
        this.owner = owner;
        this.subcategory = subcategory;
        this.valuePln = valuePln;
        this.date = date;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public InvestmentEntry(InvestmentType type, PortfolioUser owner, InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date) {
        this(null, type, owner, subcategory, valuePln, date, null, null);
    }

    public void prepareForSave(Instant now) {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }

    public UUID getId() {
        return id;
    }

    public InvestmentType getType() {
        return type;
    }

    public PortfolioUser getOwner() {
        return owner;
    }

    public InvestmentSubcategory getSubcategory() {
        return subcategory;
    }

    public BigDecimal getValuePln() {
        return valuePln;
    }

    public LocalDate getDate() {
        return date;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void update(InvestmentType type, PortfolioUser owner, InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date, Instant now) {
        this.type = type;
        this.owner = owner;
        this.subcategory = subcategory;
        this.valuePln = valuePln;
        this.date = date;
        this.updatedAt = now;
    }
}
