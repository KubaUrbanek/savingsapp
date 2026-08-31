package pl.oszczednosci.app.application.port.in;
import java.time.LocalDate;
public interface CalculatePortfolioPerformanceUseCase { PortfolioPerformanceResult calculate(InvestmentFilter filter, LocalDate valuationDate); }
