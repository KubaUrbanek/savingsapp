package pl.oszczednosci.app.application.port.in;

import java.util.List;
import pl.oszczednosci.app.domain.model.*;

public interface GetReferenceDataUseCase {
    List<InvestmentType> investmentTypes();
    List<InvestmentSubcategory> investmentSubcategories(InvestmentType type);
    List<PortfolioUser> users();
    List<InvestmentOperationType> operationTypes();
}
