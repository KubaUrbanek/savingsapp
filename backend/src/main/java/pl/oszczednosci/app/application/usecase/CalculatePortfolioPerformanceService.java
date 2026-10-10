package pl.oszczednosci.app.application.usecase;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.service.PortfolioPerformanceCalculator;

/** Application orchestration: loads through output ports, applies the request filter, then invokes the domain. */
public final class CalculatePortfolioPerformanceService implements CalculatePortfolioPerformanceUseCase {
 private final InvestmentUnitOfWork work;
 private final PortfolioPerformanceCalculator calculator; private final Clock clock;
 public CalculatePortfolioPerformanceService(InvestmentUnitOfWork work,PortfolioPerformanceCalculator calculator,Clock clock){this.work=work;this.calculator=calculator;this.clock=clock;}
 public PortfolioPerformanceResult calculate(InvestmentFilter filter,LocalDate date){
  LocalDate effectiveDate=date==null?clock.today():date;
  if(filter.type()!=null && filter.subcategory()!=null) AssetCategory.of(filter.type(),filter.subcategory());
  var snapshot=work.snapshot();
  List<ValuationSnapshot> values=snapshot.entries().stream().filter(e->e.owner().equals(filter.owner()) && matches(e.getType(),e.getSubcategory(),filter))
   .sorted(java.util.Comparator.comparing(InvestmentEntry::date).reversed().thenComparing(InvestmentEntry::createdAt,java.util.Comparator.reverseOrder()))
   .map(e->new ValuationSnapshot(AssetKey.from(e.category()),new ValuationDate(e.date()),e.value())).toList();
  List<InvestmentOperation> cash=snapshot.operations().stream().filter(o->o.owner().equals(filter.owner()) && matches(o.getType(),o.getSubcategory(),filter)).toList();
  return PortfolioPerformanceResult.from(calculator.calculate(new PortfolioHistory(values,cash),new ValuationDate(effectiveDate)));
 }
 private boolean matches(InvestmentType type,InvestmentSubcategory sub,InvestmentFilter f){return (f.type()==null||type==f.type())&&(f.subcategory()==null||sub==f.subcategory());}
}
