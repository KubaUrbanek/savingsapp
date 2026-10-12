package pl.oszczednosci.app.adapter.out.persistence.json;

import static org.assertj.core.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;
import pl.oszczednosci.app.application.usecase.PortfolioPlanService;
import pl.oszczednosci.app.domain.model.PortfolioPlan;

class PortfolioPlanMigrationTest {
    @TempDir Path temp;
    @Test void oldBackupsMigrateOnceAndNewPlansRoundTripWithoutRebalancingAgain() {
        var store = new JsonInvestmentStore(new JsonMapper(), temp.resolve("source.json"));
        store.importBackup("""
            {"formatVersion":2,"entries":[],"operations":[],"plans":{"jakub":{"bonds":30,"stocks":60,"gold":10,"developed":80,"emerging":20}}}
            """.getBytes(StandardCharsets.UTF_8));
        var service = new PortfolioPlanService(store);
        assertThat(service.load("jakub")).isEqualTo(new PortfolioPlan(30, 70, 50, 40, 10));
        var updated = new PortfolioPlan(30, 70, 40, 45, 15);
        service.save("jakub", updated);
        var clone = new JsonInvestmentStore(new JsonMapper(), temp.resolve("clone.json"));
        clone.importBackup(store.exportBackup());
        assertThat(new PortfolioPlanService(clone).load("jakub")).isEqualTo(updated);
        assertThat(new JsonMapper().readTree(clone.exportBackup()).path("plans").path("jakub").path("allocationVersion").asInt()).isEqualTo(2);
    }
    @Test void invalidAndUnknownPlansAreRejected() {
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord(50.,50.,50.,35.,15.,3).toDomain()).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord(50.,50.,null,70.,30.,null).toDomain()).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord(50.,50.,50.,35.,15.,null).toDomain()).isInstanceOf(IllegalArgumentException.class);
    }
}
