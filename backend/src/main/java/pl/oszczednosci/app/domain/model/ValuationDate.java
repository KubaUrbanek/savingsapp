package pl.oszczednosci.app.domain.model;
import java.time.LocalDate;
import java.util.Objects;
public record ValuationDate(LocalDate value) implements Comparable<ValuationDate> {
 public ValuationDate { Objects.requireNonNull(value, "Valuation date is required"); }
 public int compareTo(ValuationDate other) { return value.compareTo(other.value); }
}
