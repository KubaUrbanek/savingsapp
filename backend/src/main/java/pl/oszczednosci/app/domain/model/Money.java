package pl.oszczednosci.app.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/** A PLN amount. Callers must state whether zero is meaningful. */
public record Money(BigDecimal amount) {
    public static final int PLN_SCALE = 2;

    private Money(BigDecimal amount, boolean ignored) {
        this(amount.setScale(PLN_SCALE, RoundingMode.HALF_UP));
    }

    public Money {
        Objects.requireNonNull(amount, "Money amount is required");
        if (amount.signum() < 0) throw new IllegalArgumentException("Money cannot be negative");
        amount = amount.setScale(PLN_SCALE, RoundingMode.HALF_UP);
    }

    public static Money positive(BigDecimal amount) {
        Objects.requireNonNull(amount, "Money amount is required");
        if (amount.signum() <= 0) throw new IllegalArgumentException("Money must be greater than zero");
        return new Money(amount, true);
    }

    public static Money zeroOrPositive(BigDecimal amount) { return new Money(amount, true); }
    public static Money zero() { return zeroOrPositive(BigDecimal.ZERO); }
}
