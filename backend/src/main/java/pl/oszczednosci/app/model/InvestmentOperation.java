package pl.oszczednosci.app.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonCreator
    public InvestmentOperation(@JsonProperty("id") UUID id,
            @JsonProperty("operationType") InvestmentOperationType operationType,
            @JsonProperty("type") InvestmentType type,
            @JsonProperty("owner") PortfolioUser owner,
            @JsonProperty("subcategory") InvestmentSubcategory subcategory,
            @JsonProperty("amountPln") BigDecimal amountPln,
            @JsonProperty("feePln") BigDecimal feePln,
            @JsonProperty("taxPln") BigDecimal taxPln,
            @JsonProperty("date") LocalDate date,
            @JsonProperty("note") String note,
            @JsonProperty("createdAt") Instant createdAt) {
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

    public void prepareForSave() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
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
