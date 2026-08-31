package pl.oszczednosci.app.application.port.in; import java.util.UUID; import pl.oszczednosci.app.domain.model.InvestmentEntry;
public interface UpdateInvestmentEntryUseCase { InvestmentEntry update(UUID id, CreateInvestmentEntryCommand command); }
