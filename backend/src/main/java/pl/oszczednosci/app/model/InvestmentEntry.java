package pl.oszczednosci.app.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "investment_entries")
public class InvestmentEntry {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private InvestmentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private PortfolioUser owner;

    @Column(name = "value_pln", nullable = false, precision = 19, scale = 2)
    private BigDecimal valuePln;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected InvestmentEntry() {
    }

    public InvestmentEntry(InvestmentType type, PortfolioUser owner, BigDecimal valuePln, LocalDate date) {
        this.id = UUID.randomUUID();
        this.type = type;
        this.owner = owner;
        this.valuePln = valuePln;
        this.date = date;
    }

    @PrePersist
    void prePersist() {
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
