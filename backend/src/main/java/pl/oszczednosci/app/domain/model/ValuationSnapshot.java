package pl.oszczednosci.app.domain.model;
import java.util.Objects;
public record ValuationSnapshot(AssetKey asset, ValuationDate date, Money value) {
 public ValuationSnapshot { Objects.requireNonNull(asset); Objects.requireNonNull(date); Objects.requireNonNull(value); }
}
