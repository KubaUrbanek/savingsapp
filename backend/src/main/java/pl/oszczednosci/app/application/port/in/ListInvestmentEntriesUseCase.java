package pl.oszczednosci.app.application.port.in; import java.util.List; import pl.oszczednosci.app.domain.model.InvestmentEntry;
public interface ListInvestmentEntriesUseCase { List<InvestmentEntry> list(InvestmentFilter filter); }
