package pl.oszczednosci.app.domain.model;

/** Two levels: bonds and stocks/ETFs; gold belongs to the latter planning bucket. */
public record PortfolioPlan(double bonds, double stocks, double gold, double developed, double emerging) {
    public PortfolioPlan {
        validateRange(bonds, stocks, gold, developed, emerging);
        if (Math.abs(bonds + stocks - 100) > 0.000001
                || Math.abs(gold + developed + emerging - 100) > 0.000001) {
            throw new IllegalArgumentException("Wagi na każdym poziomie muszą sumować się do 100%.");
        }
    }

    private static void validateRange(double... weights) {
        for (double weight : weights) {
            if (!Double.isFinite(weight) || weight < 0 || weight > 100) {
                throw new IllegalArgumentException("Waga musi mieścić się w zakresie 0–100%.");
            }
        }
    }

    /** Adopt the requested 50% gold target while preserving bonds and the market ratio. */
    public static PortfolioPlan fromLegacy(double bonds, double stocks, double gold, double developed, double emerging) {
        validateRange(bonds, stocks, gold, developed, emerging);
        if (Math.abs(bonds + stocks + gold - 100) > 0.000001
                || Math.abs(developed + emerging - 100) > 0.000001) {
            throw new IllegalArgumentException("Nieprawidłowe wagi poprzedniego planu.");
        }
        return new PortfolioPlan(bonds, stocks + gold, 50, developed / 2, emerging / 2);
    }

    public static PortfolioPlan defaults() {
        return new PortfolioPlan(50, 50, 50, 35, 15);
    }
}
