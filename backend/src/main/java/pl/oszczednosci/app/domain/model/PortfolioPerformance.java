package pl.oszczednosci.app.domain.model;
import java.math.BigDecimal;
public record PortfolioPerformance(BigDecimal currentValuePln, BigDecimal contributedCapitalPln,
 BigDecimal nominalResultPln, BigDecimal returnRatePercent, BigDecimal feesPln, BigDecimal taxesPln,
 BigDecimal resultAfterFeesAndTaxesPln, BigDecimal xirrPercent, BigDecimal monthlyResultPln,
 BigDecimal monthlyReturnRatePercent) {}
