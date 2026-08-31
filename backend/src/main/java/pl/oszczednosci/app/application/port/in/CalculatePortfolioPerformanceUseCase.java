package pl.oszczednosci.app.application.port.in; import java.time.LocalDate; import pl.oszczednosci.app.domain.model.PortfolioPerformance;
public interface CalculatePortfolioPerformanceUseCase { PortfolioPerformance calculate(InvestmentFilter filter, LocalDate valuationDate); }
