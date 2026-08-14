package pl.oszczednosci.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OszczednosciApplication {

    public static void main(String[] args) {
        SpringApplication.run(OszczednosciApplication.class, args);
    }
}
