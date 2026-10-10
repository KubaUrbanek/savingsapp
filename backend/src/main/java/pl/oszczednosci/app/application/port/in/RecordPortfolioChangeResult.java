package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal;
import java.util.UUID;
public record RecordPortfolioChangeResult(UUID id, BigDecimal nextValue, String kind, boolean atomic) {}
