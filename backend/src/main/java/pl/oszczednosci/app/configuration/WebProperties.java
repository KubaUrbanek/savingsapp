package pl.oszczednosci.app.configuration;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.web")
public record WebProperties(@Valid Cors cors) {
    public WebProperties {
        cors = cors == null ? new Cors(List.of()) : cors;
    }

    public record Cors(List<@Pattern(regexp = "https?://[^/]+", message = "must be an HTTP(S) origin without a path") String> allowedOrigins) {
        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        }
    }
}
