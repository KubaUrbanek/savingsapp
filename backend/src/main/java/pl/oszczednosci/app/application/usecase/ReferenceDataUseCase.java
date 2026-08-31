package pl.oszczednosci.app.application.usecase;

import java.util.Arrays;
import java.util.List;
import pl.oszczednosci.app.application.port.in.GetReferenceDataUseCase;
import pl.oszczednosci.app.domain.model.*;

public final class ReferenceDataUseCase implements GetReferenceDataUseCase {
    public List<InvestmentType> investmentTypes() { return Arrays.asList(InvestmentType.values()); }
    public List<InvestmentSubcategory> investmentSubcategories(InvestmentType type) {
        return AssetCategory.allowedSubcategories(type);
    }
    public List<PortfolioUser> users() { return Arrays.asList(PortfolioUser.values()); }
    public List<InvestmentOperationType> operationTypes() {
        return Arrays.asList(InvestmentOperationType.values());
    }
}
