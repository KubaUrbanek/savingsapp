package pl.oszczednosci.app.domain.model;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;

final class OwnerIdTest {
    @Test void stableIdentifierRoundTrips() {
        OwnerId id = OwnerId.of("family-01");
        assertThat(OwnerId.fromExternal(id.value())).isEqualTo(id);
    }

    @Test void legacyEnumNamesMigrateAtExternalBoundaries() {
        assertThat(OwnerId.fromExternal("JAKUB")).isEqualTo(OwnerId.of("jakub"));
        assertThat(OwnerId.fromExternal("ZOSIA")).isEqualTo(OwnerId.of("zosia"));
    }

    @Test void rejectsBlankOrUnstableIdentifiers() {
        assertThatThrownBy(() -> OwnerId.of("JAKUB")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OwnerId.of(" ")).isInstanceOf(IllegalArgumentException.class);
    }
}
