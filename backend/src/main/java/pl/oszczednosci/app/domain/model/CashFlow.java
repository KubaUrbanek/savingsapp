package pl.oszczednosci.app.domain.model;
import java.time.LocalDate;
import java.util.Objects;
public record CashFlow(LocalDate date, Money amount) {
 public CashFlow { Objects.requireNonNull(date); Objects.requireNonNull(amount); }
}
