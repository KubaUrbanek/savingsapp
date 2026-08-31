package pl.oszczednosci.app.config;

import java.time.Clock;
import java.util.UUID;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.oszczednosci.app.application.port.IdGenerator;

@Configuration
public class DomainFactoriesConfig {
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean IdGenerator idGenerator() { return UUID::randomUUID; }
}
