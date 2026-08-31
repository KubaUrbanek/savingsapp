package pl.oszczednosci.app.domain.model;
import java.util.UUID;
public class InvestmentEntryNotFoundException extends RuntimeException {
 public InvestmentEntryNotFoundException(UUID id) { super("Investment entry not found: " + id); }
}
