package pl.oszczednosci.app.dto;

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
}
