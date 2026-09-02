package pl.oszczednosci.app.application.usecase;

import java.util.Arrays;
import java.util.List;
import pl.oszczednosci.app.application.port.in.GetReferenceDataUseCase;
import pl.oszczednosci.app.application.port.out.OwnerDirectory;
import pl.oszczednosci.app.domain.model.*;

public final class ReferenceDataUseCase implements GetReferenceDataUseCase {
    private final OwnerDirectory owners;

    public ReferenceDataUseCase(OwnerDirectory owners) { this.owners = owners; }
    public List<InvestmentType> investmentTypes() { return Arrays.asList(InvestmentType.values()); }
    public List<InvestmentSubcategory> investmentSubcategories(InvestmentType type) {
        return AssetCategory.allowedSubcategories(type);
    }
    public List<OwnerId> users() { return owners.availableOwners(); }
    public List<InvestmentOperationType> operationTypes() {
        return Arrays.asList(InvestmentOperationType.values());
    }
}
