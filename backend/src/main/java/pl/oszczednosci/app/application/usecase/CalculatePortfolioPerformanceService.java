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
 private final PortfolioPerformanceCalculator calculator;
 public CalculatePortfolioPerformanceService(InvestmentEntryRepository snapshots,InvestmentOperationRepository operations,PortfolioPerformanceCalculator calculator){this.snapshots=snapshots;this.operations=operations;this.calculator=calculator;}
 public PortfolioPerformanceResult calculate(InvestmentFilter filter,LocalDate date){
  if(filter.type()!=null && filter.subcategory()!=null) AssetCategory.of(filter.type(),filter.subcategory());
  List<ValuationSnapshot> values=snapshots.findByOwner(filter.owner()).stream().filter(e->matches(e.getType(),e.getSubcategory(),filter))
   .map(e->new ValuationSnapshot(AssetKey.from(e.category()),new ValuationDate(e.date()),e.value())).toList();
  List<InvestmentOperation> cash=operations.findByOwner(filter.owner()).stream().filter(o->matches(o.getType(),o.getSubcategory(),filter)).toList();
  return PortfolioPerformanceResult.from(calculator.calculate(new PortfolioHistory(values,cash),new ValuationDate(date)));
 }
 private boolean matches(InvestmentType type,InvestmentSubcategory sub,InvestmentFilter f){return (f.type()==null||type==f.type())&&(f.subcategory()==null||sub==f.subcategory());}
}
