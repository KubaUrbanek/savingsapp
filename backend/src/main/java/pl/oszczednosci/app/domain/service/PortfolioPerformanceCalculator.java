package pl.oszczednosci.app.domain.service;

import java.time.LocalDate;
import java.util.*;
import pl.oszczednosci.app.domain.model.*;

/** Pure domain calculation over an already selected portfolio history. */
public final class PortfolioPerformanceCalculator {
 private final RateOfReturnCalculator rates;
 public PortfolioPerformanceCalculator(RateOfReturnCalculator rates){this.rates=Objects.requireNonNull(rates);}
 public PortfolioPerformance calculate(PortfolioHistory history, ValuationDate cutoff) {
  List<InvestmentOperation> operations=history.operations().stream().filter(o->!o.getDate().isAfter(cutoff.value())).toList();
  Money current=valueAt(history.snapshots(),cutoff.value());
  Money deposits=sum(operations,InvestmentOperationType.DEPOSIT), withdrawals=sum(operations,InvestmentOperationType.WITHDRAWAL);
  Money capital=deposits.subtract(withdrawals), fees=sumFees(operations), taxes=sumTaxes(operations), nominal=current.subtract(capital);
  List<CashFlow> flows=new ArrayList<>();
  operations.forEach(o->{ Money amount=o.amount(); if(o.getOperationType()==InvestmentOperationType.DEPOSIT) amount=amount.add(o.fee()).negate(); else amount=amount.subtract(o.fee()).subtract(o.tax()); flows.add(new CashFlow(o.getDate(),amount)); });
  if(!current.isZero()) flows.add(new CashFlow(cutoff.value(),current));
  LocalDate monthStart=cutoff.value().withDayOfMonth(1);
  Money opening=valueAt(history.snapshots(),monthStart.minusDays(1));
  List<InvestmentOperation> monthly=operations.stream().filter(o->!o.getDate().isBefore(monthStart)).toList();
  Money monthlyDeposits=sum(monthly,InvestmentOperationType.DEPOSIT), monthlyWithdrawals=sum(monthly,InvestmentOperationType.WITHDRAWAL);
  Money monthlyResult=current.subtract(opening).subtract(monthlyDeposits).add(monthlyWithdrawals);
  return new PortfolioPerformance(current,capital,nominal,nominal.percentageOf(capital),fees,taxes,
    nominal.subtract(fees).subtract(taxes),rates.calculate(flows),monthlyResult,monthlyResult.percentageOf(opening.add(monthlyDeposits)));
 }
 private Money valueAt(List<ValuationSnapshot> snapshots,LocalDate date){
  Map<AssetKey,ValuationSnapshot> latest=new HashMap<>();
  snapshots.stream().filter(s->!s.date().value().isAfter(date)).sorted(Comparator.comparing((ValuationSnapshot s)->s.date().value()).reversed())
   .forEach(s->latest.putIfAbsent(s.asset(),s));
  return latest.values().stream().map(ValuationSnapshot::value).reduce(Money.zero(),Money::add);
 }
 private Money sum(List<InvestmentOperation> ops,InvestmentOperationType type){return ops.stream().filter(o->o.getOperationType()==type).map(InvestmentOperation::amount).reduce(Money.zero(),Money::add);}
 private Money sumFees(List<InvestmentOperation> ops){return ops.stream().map(InvestmentOperation::fee).reduce(Money.zero(),Money::add);}
 private Money sumTaxes(List<InvestmentOperation> ops){return ops.stream().map(InvestmentOperation::tax).reduce(Money.zero(),Money::add);}
}
