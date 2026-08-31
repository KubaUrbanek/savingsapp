package pl.oszczednosci.app.application.port.out;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
public interface Clock {
    Instant now();
    default LocalDate today() { return LocalDate.ofInstant(now(), ZoneOffset.UTC); }
}
