package pl.oszczednosci.app.domain.service;
import java.time.LocalDate;
import java.util.*;
import pl.oszczednosci.app.domain.model.*;
public final class PortfolioPerformanceCalculator {
 private final RateOfReturnCalculator rates;
 public PortfolioPerformanceCalculator(RateOfReturnCalculator rates){this.rates=Objects.requireNonNull(rates);}
 public PortfolioPerformance calculate(PortfolioHistory history, ValuationDate cutoff) {
  Map<AssetKey,LocalDate> basis=new HashMap<>();
  history.operations().stream().filter(o->o.getOperationType()==InvestmentOperationType.INITIAL && !o.getDate().isAfter(cutoff.value())).forEach(o->basis.merge(AssetKey.from(o.category()),o.getDate(),(a,b)->a.isAfter(b)?a:b));
  var operations=history.operations().stream().filter(o->!o.getDate().isAfter(cutoff.value()) && !o.getDate().isBefore(basis.getOrDefault(AssetKey.from(o.category()),LocalDate.MIN))).toList();
  var snapshots=history.snapshots().stream().filter(s->!s.date().value().isAfter(cutoff.value()) && !s.date().value().isBefore(basis.getOrDefault(s.asset(),LocalDate.MIN))).toList();
  Money current=valueAt(snapshots,cutoff.value());
  Money deposits=sum(operations,InvestmentOperationType.DEPOSIT).add(sum(operations,InvestmentOperationType.INITIAL));
  Money withdrawals=sum(operations,InvestmentOperationType.WITHDRAWAL);
  Money capital=deposits.add(sum(operations,InvestmentOperationType.BUY)).subtract(withdrawals).subtract(sum(operations,InvestmentOperationType.SELL));
  Money fees=sumFees(operations), taxes=sumTaxes(operations);
  boolean known=complete(snapshots,operations);
  Money nominal=known ? current.subtract(capital) : null;
  List<CashFlow> flows=new ArrayList<>();
  operations.forEach(o->{
   boolean incoming=o.getOperationType()==InvestmentOperationType.DEPOSIT || o.getOperationType()==InvestmentOperationType.INITIAL || o.getOperationType()==InvestmentOperationType.BUY;
   flows.add(new CashFlow(o.getDate(),incoming ? o.amount().negate() : o.amount()));
  });
  if(!current.isZero()) flows.add(new CashFlow(cutoff.value(),current));
  LocalDate monthStart=cutoff.value().withDayOfMonth(1);
  Money opening=valueAt(snapshots,monthStart.minusDays(1));
  var monthly=operations.stream().filter(o->!o.getDate().isBefore(monthStart)).toList();
  Money monthlyIn=sum(monthly,InvestmentOperationType.DEPOSIT).add(sum(monthly,InvestmentOperationType.BUY));
  Money monthlyOut=sum(monthly,InvestmentOperationType.WITHDRAWAL).add(sum(monthly,InvestmentOperationType.SELL));
  // Existing savings entered mid-month are not a known beginning-of-month balance.
  boolean monthKnown=known && monthly.stream().noneMatch(o->o.getOperationType()==InvestmentOperationType.INITIAL)
    && snapshots.stream().map(ValuationSnapshot::asset).distinct().allMatch(asset ->
      snapshots.stream().anyMatch(s->s.asset().equals(asset) && s.date().value().isBefore(monthStart)) ||
      operations.stream().filter(o->AssetKey.from(o.category()).equals(asset)).map(InvestmentOperation::getDate).min(LocalDate::compareTo).map(d->!d.isBefore(monthStart)).orElse(false));
  Money monthlyResult=monthKnown ? current.subtract(opening).subtract(monthlyIn).add(monthlyOut) : null;
  return new PortfolioPerformance(current,known ? capital : null,nominal,known ? nominal.percentageOf(capital) : null,fees,taxes,
    nominal, known ? rates.calculate(flows) : RateOfReturnResult.failure(RateOfReturnResult.Status.INCOMPLETE_HISTORY),
    monthlyResult,monthKnown ? monthlyResult.percentageOf(opening.add(monthlyIn)) : null,deposits,withdrawals);
 }
 private boolean complete(List<ValuationSnapshot> snapshots,List<InvestmentOperation> operations) {
  if(snapshots.isEmpty()) return false;
  Map<AssetKey,LocalDate> first=new HashMap<>();
  snapshots.forEach(s->first.merge(s.asset(),s.date().value(),(a,b)->a.isBefore(b)?a:b));
  if(operations.stream().anyMatch(o->!first.containsKey(AssetKey.from(o.category())))) return false;
  for(var asset:first.entrySet()) {
   boolean covered=operations.stream().anyMatch(o->AssetKey.from(o.category()).equals(asset.getKey()) && !o.getDate().isAfter(asset.getValue()) &&
    (o.getOperationType()==InvestmentOperationType.DEPOSIT || o.getOperationType()==InvestmentOperationType.BUY || o.getOperationType()==InvestmentOperationType.INITIAL));
   if(!covered) return false;
  }
  return true;
 }
 private Money valueAt(List<ValuationSnapshot> snapshots,LocalDate date){
  Map<AssetKey,ValuationSnapshot> latest=new LinkedHashMap<>();
  // Input order is newest first on equal dates (repository's creation-time tie-breaker).
  snapshots.stream().filter(s->!s.date().value().isAfter(date)).sorted(Comparator.comparing((ValuationSnapshot s)->s.date().value()).reversed())
   .forEach(s->latest.putIfAbsent(s.asset(),s));
  return latest.values().stream().map(ValuationSnapshot::value).reduce(Money.zero(),Money::add);
 }
 private Money sum(List<InvestmentOperation> ops,InvestmentOperationType type){return ops.stream().filter(o->o.getOperationType()==type).map(InvestmentOperation::amount).reduce(Money.zero(),Money::add);}
 private Money sumFees(List<InvestmentOperation> ops){return ops.stream().map(InvestmentOperation::fee).reduce(Money.zero(),Money::add);}
 private Money sumTaxes(List<InvestmentOperation> ops){return ops.stream().map(InvestmentOperation::tax).reduce(Money.zero(),Money::add);}
}
