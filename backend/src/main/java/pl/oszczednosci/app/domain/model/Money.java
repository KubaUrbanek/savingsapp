package pl.oszczednosci.app.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/** A PLN amount. Rounding and arithmetic belong here so amounts never leak scale rules. */
public final class Money {
    public static final int PLN_SCALE = 2;
    private static final RoundingMode PLN_ROUNDING = RoundingMode.HALF_UP;

    private final BigDecimal amount;

    /** Creates a non-negative monetary input. Calculated results may become signed through arithmetic. */
    public Money(BigDecimal amount) {
        this(amount, false);
    }

    private Money(BigDecimal amount, boolean signed) {
        BigDecimal normalized = normalizePln(amount);
        if (!signed && normalized.signum() < 0) {
            throw new IllegalArgumentException("Money cannot be negative");
        }
        this.amount = normalized;
    }

    public static Money positive(BigDecimal amount) {
        Money money = new Money(amount);
        if (!money.isPositive()) {
            throw new IllegalArgumentException("Money must be greater than zero");
        }
        return money;
    }

    public static Money zeroOrPositive(BigDecimal amount) {
        return new Money(amount);
    }

    public static Money zero() {
        return new Money(BigDecimal.ZERO);
    }

    private static BigDecimal normalizePln(BigDecimal amount) {
        return Objects.requireNonNull(amount, "Money amount is required").setScale(PLN_SCALE, PLN_ROUNDING);
    }

    private static Money signed(BigDecimal amount) {
        return new Money(amount, true);
    }

    public BigDecimal amount() { return amount; }
    public Money add(Money other) { return signed(amount.add(other.amount)); }
    public Money subtract(Money other) { return signed(amount.subtract(other.amount)); }
    public Money negate() { return signed(amount.negate()); }
    public boolean isPositive() { return amount.signum() > 0; }
    public boolean isZero() { return amount.signum() == 0; }
    public BigDecimal percentageOf(Money base) { return base.isPositive() ? amount.multiply(BigDecimal.valueOf(100)).divide(base.amount, 4, PLN_ROUNDING) : null; }
    @Override public boolean equals(Object o) { return o instanceof Money m && amount.equals(m.amount); }
    @Override public int hashCode() { return amount.hashCode(); }
    @Override public String toString() { return amount.toString(); }
}
