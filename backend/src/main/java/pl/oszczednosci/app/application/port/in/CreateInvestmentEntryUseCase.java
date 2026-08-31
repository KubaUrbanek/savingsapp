package pl.oszczednosci.app.application.port.in; import pl.oszczednosci.app.domain.model.InvestmentEntry;
public interface CreateInvestmentEntryUseCase { InvestmentEntry create(CreateInvestmentEntryCommand command); }
