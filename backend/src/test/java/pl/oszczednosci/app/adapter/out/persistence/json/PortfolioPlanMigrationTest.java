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
            {"formatVersion":2,"entries":[],"operations":[],"plans":{"household":{"bonds":30,"stocks":60,"gold":10,"developed":80,"emerging":20}}}
            """.getBytes(StandardCharsets.UTF_8));
        var service = new PortfolioPlanService(store);
        assertThat(service.load("jakub")).isEqualTo(new PortfolioPlan(30, 35, 28, 7));
        var updated = new PortfolioPlan(30, 23, 31.5, 10.5, 5);
        service.save("jakub", updated);
        var clone = new JsonInvestmentStore(new JsonMapper(), temp.resolve("clone.json"));
        clone.importBackup(store.exportBackup());
        assertThat(new PortfolioPlanService(clone).load("jakub")).isEqualTo(updated);
        assertThat(new JsonMapper().readTree(clone.exportBackup()).path("plans").path("household").path("allocationVersion").asInt()).isEqualTo(4);
    }
    @Test void personalOnlyBackupRequiresAnExplicitSelectionAndNeverChangesData() {
        var store = new JsonInvestmentStore(new JsonMapper(), temp.resolve("personal.json"));
        assertThatThrownBy(() -> store.importBackup("{\"formatVersion\":2,\"entries\":[],\"operations\":[],\"plans\":{\"jakub\":{\"allocationVersion\":2,\"bonds\":50,\"stocks\":50,\"gold\":50,\"developed\":35,\"emerging\":15}}}".getBytes(StandardCharsets.UTF_8))).isInstanceOf(pl.oszczednosci.app.application.exception.MalformedImportException.class);
        assertThat(store.snapshot().plans()).isEmpty();
    }
    @Test void invalidAndUnknownPlansAreRejected() {
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord("50","50","50","35","15",5,null).toDomain()).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord("50","50",null,"70","30",null,null).toDomain()).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PortfolioPlanJsonRecord("50","50","50","35","15",null,null).toDomain()).isInstanceOf(IllegalArgumentException.class);
    }
}
