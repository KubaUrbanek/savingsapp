package pl.oszczednosci.app.domain.model;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

class PortfolioPlanTest {
    @Test void goldIsHalfOfTheDefaultStockBucket() {
        var plan = PortfolioPlan.defaults();
        assertThat(plan.stocks() * plan.gold() / 100).isEqualTo(25);
        assertThat(plan.gold() + plan.developed() + plan.emerging()).isEqualTo(100);
        assertThatThrownBy(() -> new PortfolioPlan(50, 50, 50, 70, 30)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlan(50, 40, 50, 35, 15)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlan(50, 50, Double.NaN, 35, 15)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void migrationPreservesBondsAndRelativeMarketWeights() {
        assertThat(PortfolioPlan.fromLegacy(30, 60, 10, 80, 20)).isEqualTo(new PortfolioPlan(30, 70, 50, 40, 10));
        assertThat(PortfolioPlan.fromLegacy(100, 0, 0, 70, 30)).isEqualTo(new PortfolioPlan(100, 0, 50, 35, 15));
        assertThatThrownBy(() -> PortfolioPlan.fromLegacy(50, 60, 10, 80, 20)).isInstanceOf(IllegalArgumentException.class);
    }
}
