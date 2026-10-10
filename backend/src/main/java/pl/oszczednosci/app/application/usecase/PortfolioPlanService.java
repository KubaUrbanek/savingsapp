package pl.oszczednosci.app.application.usecase;
import java.util.*;
import pl.oszczednosci.app.application.port.in.PortfolioPlanUseCase;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.domain.model.PortfolioPlan;
public final class PortfolioPlanService implements PortfolioPlanUseCase {
 private final InvestmentUnitOfWork work;
 public PortfolioPlanService(InvestmentUnitOfWork work){this.work=work;}
 public PortfolioPlan load(String scope){InvestmentBackup.validateScope(scope);return work.snapshot().plans().getOrDefault(scope,PortfolioPlan.defaults());}
 public void save(String scope,PortfolioPlan plan){InvestmentBackup.validateScope(scope);Objects.requireNonNull(plan);work.update(b->{var plans=new HashMap<>(b.plans());plans.put(scope,plan);return new InvestmentBackup(b.formatVersion(),b.entries(),b.operations(),plans);});}
}
