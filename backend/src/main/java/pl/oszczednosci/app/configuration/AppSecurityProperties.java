package pl.oszczednosci.app.configuration;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.security")
public record AppSecurityProperties(@Valid User reader, @Valid User administrator) {
    public record User(@NotBlank String username, @NotBlank String password) {}

    @AssertTrue(message = "reader and administrator usernames must be different")
    public boolean hasDistinctUsernames() {
        return reader != null && administrator != null && !reader.username().equals(administrator.username());
    }
}
