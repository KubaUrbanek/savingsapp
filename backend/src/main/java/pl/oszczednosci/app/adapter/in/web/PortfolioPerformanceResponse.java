package pl.oszczednosci.app.adapter.in.web;

import java.math.BigDecimal;

public record PortfolioPerformanceResponse(
        BigDecimal currentValuePln,
        BigDecimal contributedCapitalPln,
        BigDecimal nominalResultPln,
        BigDecimal returnRatePercent,
        BigDecimal feesPln,
        BigDecimal taxesPln,
        BigDecimal resultAfterFeesAndTaxesPln,
        BigDecimal xirrPercent,
        BigDecimal monthlyResultPln,
        BigDecimal monthlyReturnRatePercent) {
 public static PortfolioPerformanceResponse from(pl.oszczednosci.app.domain.model.PortfolioPerformance p) { return new PortfolioPerformanceResponse(p.currentValuePln(),p.contributedCapitalPln(),p.nominalResultPln(),p.returnRatePercent(),p.feesPln(),p.taxesPln(),p.resultAfterFeesAndTaxesPln(),p.xirrPercent(),p.monthlyResultPln(),p.monthlyReturnRatePercent()); }
}
