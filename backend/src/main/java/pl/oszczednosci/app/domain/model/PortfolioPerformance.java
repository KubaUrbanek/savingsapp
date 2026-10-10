package pl.oszczednosci.app.domain.model;
import java.math.BigDecimal;
/** Null result/capital means that the acquisition history is incomplete. Costs are already in actual balances. */
public record PortfolioPerformance(Money currentValue, Money contributedCapital, Money nominalResult,
 BigDecimal returnRatePercent, Money fees, Money taxes, Money resultAfterFeesAndTaxes,
 RateOfReturnResult rateOfReturn, Money monthlyResult, BigDecimal monthlyReturnRatePercent,
 Money depositsTotal, Money withdrawalsTotal) {}
