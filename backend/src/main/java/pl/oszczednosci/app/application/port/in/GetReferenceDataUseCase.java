package pl.oszczednosci.app.application.port.in;

import java.util.List;
import pl.oszczednosci.app.domain.model.*;

public interface GetReferenceDataUseCase {
    List<InvestmentType> investmentTypes();
    List<InvestmentSubcategory> investmentSubcategories(InvestmentType type);
    List<OwnerId> users();
    List<InvestmentOperationType> operationTypes();
}
