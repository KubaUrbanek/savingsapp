package pl.oszczednosci.app.domain.model;
import java.util.List;
import java.util.Objects;
public record PortfolioHistory(List<ValuationSnapshot> snapshots, List<InvestmentOperation> operations) {
 public PortfolioHistory { snapshots=List.copyOf(Objects.requireNonNull(snapshots)); operations=List.copyOf(Objects.requireNonNull(operations)); }
}
