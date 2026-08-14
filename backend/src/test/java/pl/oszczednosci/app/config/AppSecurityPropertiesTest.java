package pl.oszczednosci.app.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "MASTER_PASSWORD=configtree-secret")
class AppSecurityPropertiesTest {

    @Autowired
    private AppSecurityProperties properties;

    @Test
    void mapsMasterPasswordFromEnvironmentProperty() {
        assertThat(properties.masterPassword()).isEqualTo("configtree-secret");
    }
}
