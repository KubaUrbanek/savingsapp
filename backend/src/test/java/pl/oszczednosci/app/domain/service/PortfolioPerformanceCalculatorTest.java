package pl.oszczednosci.app.domain.service;
import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import pl.oszczednosci.app.domain.model.*;
class PortfolioPerformanceCalculatorTest {
 private final AssetKey asset=new AssetKey(InvestmentType.GIELDA,InvestmentSubcategory.RYNKI_ROZWINIETE);
 private final AssetKey cash=new AssetKey(InvestmentType.KONTO_BANKOWE,null);
 private Money m(String n){return new Money(new BigDecimal(n));}
 private ValuationSnapshot v(AssetKey k,String d,String n){return new ValuationSnapshot(k,new ValuationDate(LocalDate.parse(d)),m(n));}
 private InvestmentOperation o(AssetKey k,InvestmentOperationType t,String d,String n){return InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()),t,AssetCategory.of(k.type(),k.subcategory()),OwnerId.of("jakub"),m(n),Money.zero(),Money.zero(),LocalDate.parse(d),null,Instant.EPOCH);}
 private PortfolioPerformance calculate(List<ValuationSnapshot> s,List<InvestmentOperation> o){return new PortfolioPerformanceCalculator(new NumericalRateOfReturnCalculator()).calculate(new PortfolioHistory(s,o),new ValuationDate(LocalDate.parse("2026-10-10")));}
 @Test void valueWithoutAcquisitionHistoryDoesNotInventProfit(){
  var p=calculate(List.of(v(cash,"2026-10-10","500")),List.of());
  assertThat(p.currentValue()).isEqualTo(m("500"));assertThat(p.nominalResult()).isNull();assertThat(p.monthlyResult()).isNull();assertThat(p.contributedCapital()).isNull();assertThat(p.rateOfReturn().status()).isEqualTo(RateOfReturnResult.Status.INCOMPLETE_HISTORY);
 }
 @Test void initialSavingsHaveKnownLifetimeResultButUnknownEntryMonthPerformance(){
  var p=calculate(List.of(v(asset,"2026-10-10","1100")),List.of(o(asset,InvestmentOperationType.INITIAL,"2026-10-10","1000")));
  assertThat(p.nominalResult()).isEqualTo(m("100"));assertThat(p.monthlyResult()).isNull();
 }
 @Test void depositsAreNotGains(){
  var p=calculate(List.of(v(asset,"2026-09-30","1100"),v(asset,"2026-10-10","1300")),List.of(o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","1000"),o(asset,InvestmentOperationType.DEPOSIT,"2026-10-10","200")));
  assertThat(p.depositsTotal()).isEqualTo(m("1200"));assertThat(p.nominalResult()).isEqualTo(m("100"));assertThat(p.monthlyResult()).isEqualTo(Money.zero());
 }
 @Test void purchaseIsNotProfitAndTransferDoesNotIncreaseTotalWealth(){
  var ops=List.of(o(cash,InvestmentOperationType.DEPOSIT,"2026-09-01","1000"),o(cash,InvestmentOperationType.SELL,"2026-10-10","100"),o(asset,InvestmentOperationType.BUY,"2026-10-10","100"));
  var p=calculate(List.of(v(cash,"2026-09-30","1000"),v(cash,"2026-10-10","900"),v(asset,"2026-10-10","100")),ops);
  assertThat(p.currentValue()).isEqualTo(m("1000"));assertThat(p.contributedCapital()).isEqualTo(m("1000"));assertThat(p.nominalResult()).isEqualTo(Money.zero());assertThat(p.monthlyResult()).isEqualTo(Money.zero());assertThat(p.rateOfReturn().percent()).isEqualByComparingTo("0");
  var filtered=calculate(List.of(v(asset,"2026-10-10","100")),List.of(ops.get(2)));
  assertThat(filtered.nominalResult()).isEqualTo(Money.zero());assertThat(filtered.rateOfReturn().status()).isEqualTo(RateOfReturnResult.Status.SAME_DAY_FLOWS);
 }
 @Test void withdrawalPreservesProfitAndFutureDataIsExcluded(){
  var p=calculate(List.of(v(asset,"2026-09-30","1100"),v(asset,"2026-10-10","900"),v(asset,"2026-11-10","9999")),List.of(o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","1000"),o(asset,InvestmentOperationType.WITHDRAWAL,"2026-10-10","200"),o(asset,InvestmentOperationType.DEPOSIT,"2026-11-10","9999")));
  assertThat(p.nominalResult()).isEqualTo(m("100"));assertThat(p.monthlyResult()).isEqualTo(Money.zero());assertThat(p.withdrawalsTotal()).isEqualTo(m("200"));
 }
 @Test void feesAlreadyIncludedInActualBalanceAreNotSubtractedTwice(){
  var op=InvestmentOperation.create(new InvestmentOperationId(UUID.randomUUID()),InvestmentOperationType.DEPOSIT,AssetCategory.of(asset.type(),asset.subcategory()),OwnerId.of("jakub"),m("1000"),m("5"),m("3"),LocalDate.parse("2026-09-01"),null,Instant.EPOCH);
  var p=calculate(List.of(v(asset,"2026-09-30","992")),List.of(op));
  assertThat(p.nominalResult()).isEqualTo(m("8").negate());assertThat(p.resultAfterFeesAndTaxes()).isEqualTo(p.nominalResult());assertThat(p.fees()).isEqualTo(m("5"));
 }
 @Test void oneMissingAssetBasisMakesTheCombinedResultUnknown(){
  var p=calculate(List.of(v(asset,"2026-09-30","100"),v(cash,"2026-09-30","100")),List.of(o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","100")));
  assertThat(p.nominalResult()).isNull();
 }
 @Test void latestInputWinsEqualDateTie(){
  var p=calculate(List.of(v(asset,"2026-10-10","125"),v(asset,"2026-10-10","100")),List.of(o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","100")));
  assertThat(p.currentValue()).isEqualTo(m("125"));
 }
 @Test void absentOpeningValuationDoesNotTurnLifetimeSavingsIntoMonthlyProfit(){
  var p=calculate(List.of(v(asset,"2026-10-10","1100")),List.of(o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","1000")));
  assertThat(p.nominalResult()).isEqualTo(m("100"));assertThat(p.monthlyResult()).isNull();
 }
 @Test void contributionToUnvaluedAssetDoesNotInventACombinedLoss(){
  var p=calculate(List.of(v(cash,"2026-09-30","1000")),List.of(o(cash,InvestmentOperationType.DEPOSIT,"2026-09-01","1000"),o(asset,InvestmentOperationType.DEPOSIT,"2026-09-01","1000")));
  assertThat(p.nominalResult()).isNull();
 }

}
