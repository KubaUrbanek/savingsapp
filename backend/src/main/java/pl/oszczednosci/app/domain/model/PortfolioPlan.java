package pl.oszczednosci.app.domain.model;

import java.math.BigDecimal;

/** Exact decimal, flat allocation shared by every calculation scope. */
public record PortfolioPlan(BigDecimal bonds, BigDecimal gold, BigDecimal developed, BigDecimal emerging, BigDecimal bitcoin) {
    public PortfolioPlan(BigDecimal bonds, BigDecimal gold, BigDecimal developed, BigDecimal emerging) { this(bonds, gold, developed, emerging, BigDecimal.ZERO); }
    public PortfolioPlan {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal weight : new BigDecimal[]{bonds, gold, developed, emerging, bitcoin}) {
            if (weight == null || weight.signum() < 0 || weight.compareTo(BigDecimal.valueOf(100)) > 0)
                throw new IllegalArgumentException("Waga musi mieścić się w zakresie 0–100%.");
            if (weight.stripTrailingZeros().scale() > 50)
                throw new IllegalArgumentException("Udział może mieć najwyżej 50 miejsc po przecinku.");
            total = total.add(weight);
        }
        if (total.compareTo(BigDecimal.valueOf(100)) != 0)
            throw new IllegalArgumentException("Udziały muszą sumować się do 100%.");
        bonds = bonds.stripTrailingZeros(); gold = gold.stripTrailingZeros();
        developed = developed.stripTrailingZeros(); emerging = emerging.stripTrailingZeros(); bitcoin = bitcoin.stripTrailingZeros();
    }
    public PortfolioPlan(double bonds, double gold, double developed, double emerging) {
        this(decimal(bonds), decimal(gold), decimal(developed), decimal(emerging));
    }
    public PortfolioPlan(double bonds, double gold, double developed, double emerging, double bitcoin) { this(decimal(bonds), decimal(gold), decimal(developed), decimal(emerging), decimal(bitcoin)); }
    private static BigDecimal decimal(double number) {
        if (!Double.isFinite(number)) throw new IllegalArgumentException("Udział musi być liczbą.");
        return BigDecimal.valueOf(number);
    }
    public static PortfolioPlan fromTwoLevel(BigDecimal bonds, BigDecimal stocks, BigDecimal gold, BigDecimal developed, BigDecimal emerging) {
        if (stocks == null || stocks.signum() < 0 || bonds.add(stocks).compareTo(BigDecimal.valueOf(100)) != 0)
            throw new IllegalArgumentException("Nieprawidłowy stary plan.");
        new PortfolioPlan(BigDecimal.ZERO, gold, developed, emerging);
        var bucket = stocks.movePointLeft(2);
        return new PortfolioPlan(bonds, bucket.multiply(gold), bucket.multiply(developed), bucket.multiply(emerging));
    }
    public static PortfolioPlan fromLegacy(BigDecimal bonds, BigDecimal stocks, BigDecimal gold, BigDecimal developed, BigDecimal emerging) {
        if (stocks == null || gold == null || stocks.signum() < 0 || gold.signum() < 0
                || bonds.add(stocks).add(gold).compareTo(BigDecimal.valueOf(100)) != 0)
            throw new IllegalArgumentException("Nieprawidłowy poprzedni plan.");
        return fromTwoLevel(bonds, stocks.add(gold), BigDecimal.valueOf(50), developed.divide(BigDecimal.valueOf(2)), emerging.divide(BigDecimal.valueOf(2)));
    }
    public static PortfolioPlan fromLegacy(double bonds, double stocks, double gold, double developed, double emerging) {
        return fromLegacy(decimal(bonds), decimal(stocks), decimal(gold), decimal(developed), decimal(emerging));
    }
    public static PortfolioPlan defaults() { return new PortfolioPlan(50, 25, 17.5, 7.5); }
}
