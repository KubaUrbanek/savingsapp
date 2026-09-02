package pl.oszczednosci.app.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "app.security.reader.username=auditor",
        "app.security.reader.password=reader-secret",
        "app.security.administrator.username=operator",
        "app.security.administrator.password=admin-secret"
})
class AppSecurityPropertiesTest {

    @Autowired
    private AppSecurityProperties properties;

    @Autowired
    private Validator validator;

    @Test
    void mapsCredentialsUsedByTheSecurityBoundary() {
        assertThat(properties.reader().username()).isEqualTo("auditor");
        assertThat(properties.administrator().username()).isEqualTo("operator");
    }

    @Test
    void rejectsCorsWildcardsAndValuesThatAreNotOrigins() {
        WebProperties invalid = new WebProperties(new WebProperties.Cors(List.of("*", "https://example.com/path")));

        assertThat(validator.validate(invalid)).hasSize(2);
    }
}
