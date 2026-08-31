package pl.oszczednosci.app.application.port.in;
import java.math.BigDecimal;
import pl.oszczednosci.app.domain.model.*;
/** Application-facing result; transport adapters decide how to serialize it. */
public record PortfolioPerformanceResult(BigDecimal currentValuePln, BigDecimal contributedCapitalPln,
 BigDecimal nominalResultPln, BigDecimal returnRatePercent, BigDecimal feesPln, BigDecimal taxesPln,
 BigDecimal resultAfterFeesAndTaxesPln, RateOfReturnResult rateOfReturn, BigDecimal monthlyResultPln,
 BigDecimal monthlyReturnRatePercent) {
 public static PortfolioPerformanceResult from(PortfolioPerformance p){return new PortfolioPerformanceResult(
  p.currentValue().amount(),p.contributedCapital().amount(),p.nominalResult().amount(),p.returnRatePercent(),
  p.fees().amount(),p.taxes().amount(),p.resultAfterFeesAndTaxes().amount(),p.rateOfReturn(),
  p.monthlyResult().amount(),p.monthlyReturnRatePercent());}
}
