package pl.oszczednosci.app.adapter.out.persistence.json;

import pl.oszczednosci.app.domain.model.PortfolioPlan;

record PortfolioPlanJsonRecord(Double bonds, Double stocks, Double gold, Double developed, Double emerging,
                               Integer allocationVersion, Double bitcoin) {
    PortfolioPlan toDomain() {
        if (bonds == null || stocks == null || gold == null || developed == null || emerging == null) {
            throw new IllegalArgumentException("Niekompletny plan portfela.");
        }
        if (allocationVersion == null || allocationVersion == 1) {
            return PortfolioPlan.fromLegacy(bonds, stocks, gold, developed, emerging);
        }
        if (allocationVersion != 2 && allocationVersion != 3) throw new IllegalArgumentException("Nieobsługiwana wersja planu portfela.");
        if (allocationVersion == 3 && bitcoin == null) throw new IllegalArgumentException("Brak wagi Bitcoina.");
        return new PortfolioPlan(bonds, stocks, gold, developed, emerging, allocationVersion == 2 ? 0 : bitcoin);
    }

    static PortfolioPlanJsonRecord from(PortfolioPlan plan) {
        return new PortfolioPlanJsonRecord(plan.bonds(), plan.stocks(), plan.gold(), plan.developed(), plan.emerging(), 3, plan.bitcoin());
    }
}
