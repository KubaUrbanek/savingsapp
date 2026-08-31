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
        String xirrStatus,
        BigDecimal monthlyResultPln,
        BigDecimal monthlyReturnRatePercent) {
 public static PortfolioPerformanceResponse from(pl.oszczednosci.app.application.port.in.PortfolioPerformanceResult p) { return new PortfolioPerformanceResponse(p.currentValuePln(),p.contributedCapitalPln(),p.nominalResultPln(),p.returnRatePercent(),p.feesPln(),p.taxesPln(),p.resultAfterFeesAndTaxesPln(),p.rateOfReturn().percent(),p.rateOfReturn().status().name(),p.monthlyResultPln(),p.monthlyReturnRatePercent()); }
}
