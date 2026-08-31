package pl.oszczednosci.app.application.port.in; import pl.oszczednosci.app.domain.model.InvestmentOperation;
public interface CreateInvestmentOperationUseCase { InvestmentOperation create(CreateInvestmentOperationCommand command); }
