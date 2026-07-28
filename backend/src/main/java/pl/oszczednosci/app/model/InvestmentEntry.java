package pl.oszczednosci.app.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

public class InvestmentEntry {

    private UUID id;
    private InvestmentType type;
    private PortfolioUser owner;
    private InvestmentSubcategory subcategory;
    private BigDecimal valuePln;
    private LocalDate date;
    private Instant createdAt;

    @JsonCreator
    public InvestmentEntry(
            @JsonProperty("id") UUID id,
            @JsonProperty("type") InvestmentType type,
            @JsonProperty("owner") PortfolioUser owner,
            @JsonProperty("subcategory") InvestmentSubcategory subcategory,
            @JsonProperty("valuePln") BigDecimal valuePln,
            @JsonProperty("date") LocalDate date,
            @JsonProperty("createdAt") Instant createdAt
    ) {
        this.id = id;
        this.type = type;
        this.owner = owner;
        this.subcategory = subcategory;
        this.valuePln = valuePln;
        this.date = date;
        this.createdAt = createdAt;
    }

    public InvestmentEntry(InvestmentType type, PortfolioUser owner, InvestmentSubcategory subcategory, BigDecimal valuePln, LocalDate date) {
        this(null, type, owner, subcategory, valuePln, date, null);
    }

    public void prepareForSave() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
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
}
