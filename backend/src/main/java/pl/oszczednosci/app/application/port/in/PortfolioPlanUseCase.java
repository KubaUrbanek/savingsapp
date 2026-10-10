package pl.oszczednosci.app.application.port.in;
import pl.oszczednosci.app.domain.model.PortfolioPlan;
public interface PortfolioPlanUseCase {
 PortfolioPlan load(String scope);
 void save(String scope,PortfolioPlan plan);
}
