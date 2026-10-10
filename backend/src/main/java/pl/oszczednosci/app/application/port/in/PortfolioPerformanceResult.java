package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal;
import pl.oszczednosci.app.domain.model.*;
public record PortfolioPerformanceResult(BigDecimal currentValuePln, BigDecimal contributedCapitalPln,
 BigDecimal nominalResultPln, BigDecimal returnRatePercent, BigDecimal feesPln, BigDecimal taxesPln,
 BigDecimal resultAfterFeesAndTaxesPln, RateOfReturnResult rateOfReturn, BigDecimal monthlyResultPln,
 BigDecimal monthlyReturnRatePercent, BigDecimal depositsTotalPln, BigDecimal withdrawalsTotalPln) {
 private static BigDecimal amount(Money value){return value==null?null:value.amount();}
 public static PortfolioPerformanceResult from(PortfolioPerformance p){return new PortfolioPerformanceResult(
  amount(p.currentValue()),amount(p.contributedCapital()),amount(p.nominalResult()),p.returnRatePercent(),
  amount(p.fees()),amount(p.taxes()),amount(p.resultAfterFeesAndTaxes()),p.rateOfReturn(),
  amount(p.monthlyResult()),p.monthlyReturnRatePercent(),amount(p.depositsTotal()),amount(p.withdrawalsTotal()));}
}
