package pl.oszczednosci.app.domain.model;
import java.math.BigDecimal;
/** Framework-independent calculation result. */
public record PortfolioPerformance(Money currentValue, Money contributedCapital, Money nominalResult,
 BigDecimal returnRatePercent, Money fees, Money taxes, Money resultAfterFeesAndTaxes,
 RateOfReturnResult rateOfReturn, Money monthlyResult, BigDecimal monthlyReturnRatePercent) {}
