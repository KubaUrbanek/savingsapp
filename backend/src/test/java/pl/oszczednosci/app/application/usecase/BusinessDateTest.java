package pl.oszczednosci.app.application.usecase;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import java.time.Instant;
import pl.oszczednosci.app.application.port.out.Clock;
class BusinessDateTest {
 @Test void usesWarsawAtMidnightAndBothClockTransitions() {
  for (String[] example : new String[][]{{"2026-11-15T23:30:00Z","2026-11-16"},{"2026-06-01T22:30:00Z","2026-06-02"},{"2026-03-29T00:30:00Z","2026-03-29"},{"2026-03-29T01:30:00Z","2026-03-29"},{"2026-10-25T00:30:00Z","2026-10-25"},{"2026-10-25T01:30:00Z","2026-10-25"}}) {
   Clock clock=()->Instant.parse(example[0]); assertThat(clock.today().toString()).isEqualTo(example[1]);
  }
 }
}
