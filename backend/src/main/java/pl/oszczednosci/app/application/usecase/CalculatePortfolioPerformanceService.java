package pl.oszczednosci.app.application.usecase;
import java.time.LocalDate;
import java.util.List;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.service.PortfolioPerformanceCalculator;

/** Application orchestration: loads through output ports, applies the request filter, then invokes the domain. */
public final class CalculatePortfolioPerformanceService implements CalculatePortfolioPerformanceUseCase {
 private final InvestmentEntryRepository snapshots; private final InvestmentOperationRepository operations;
 private final PortfolioPerformanceCalculator calculator; private final Clock clock;
 public CalculatePortfolioPerformanceService(InvestmentEntryRepository snapshots,InvestmentOperationRepository operations,PortfolioPerformanceCalculator calculator,Clock clock){this.snapshots=snapshots;this.operations=operations;this.calculator=calculator;this.clock=clock;}
 public PortfolioPerformanceResult calculate(InvestmentFilter filter,LocalDate date){
  LocalDate effectiveDate=date==null?clock.today():date;
  if(filter.type()!=null && filter.subcategory()!=null) AssetCategory.of(filter.type(),filter.subcategory());
  List<ValuationSnapshot> values=snapshots.matching(InvestmentEntryCriteria.matching(filter.owner(),filter.type(),filter.subcategory())).stream()
   .map(e->new ValuationSnapshot(AssetKey.from(e.category()),new ValuationDate(e.date()),e.value())).toList();
  List<InvestmentOperation> cash=operations.matching(InvestmentOperationCriteria.matching(filter.owner(),filter.type(),filter.subcategory()));
  return PortfolioPerformanceResult.from(calculator.calculate(new PortfolioHistory(values,cash),new ValuationDate(effectiveDate)));
 }
 private boolean matches(InvestmentType type,InvestmentSubcategory sub,InvestmentFilter f){return (f.type()==null||type==f.type())&&(f.subcategory()==null||sub==f.subcategory());}
}
