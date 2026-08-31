package pl.oszczednosci.app.application.port.in; import java.util.List; import pl.oszczednosci.app.domain.model.InvestmentOperation;
public interface ListInvestmentOperationsUseCase { List<InvestmentOperation> list(InvestmentFilter filter); }
