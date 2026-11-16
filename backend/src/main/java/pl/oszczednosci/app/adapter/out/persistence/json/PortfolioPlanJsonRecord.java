package pl.oszczednosci.app.adapter.out.persistence.json;

import pl.oszczednosci.app.domain.model.PortfolioPlan;

record PortfolioPlanJsonRecord(String bonds, String stocks, String gold, String developed, String emerging,
                               Integer allocationVersion) {
    PortfolioPlan toDomain() {
        if (bonds == null || gold == null || developed == null || emerging == null)
            throw new IllegalArgumentException("Niekompletny plan portfela.");
        var b = new java.math.BigDecimal(bonds); var g = new java.math.BigDecimal(gold);
        var d = new java.math.BigDecimal(developed); var e = new java.math.BigDecimal(emerging);
        if (allocationVersion == null || allocationVersion == 1)
            return PortfolioPlan.fromLegacy(b, new java.math.BigDecimal(stocks), g, d, e);
        if (allocationVersion == 2) return PortfolioPlan.fromTwoLevel(b, new java.math.BigDecimal(stocks), g, d, e);
        if (allocationVersion != 3) throw new IllegalArgumentException("Nieobsługiwana wersja planu portfela.");
        return new PortfolioPlan(b, g, d, e);
    }

    static PortfolioPlanJsonRecord from(PortfolioPlan plan) {
        return new PortfolioPlanJsonRecord(plan.bonds().toPlainString(), null, plan.gold().toPlainString(), plan.developed().toPlainString(), plan.emerging().toPlainString(), 3);
    }
}
