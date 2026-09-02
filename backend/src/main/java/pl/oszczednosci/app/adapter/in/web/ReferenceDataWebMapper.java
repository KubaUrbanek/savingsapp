package pl.oszczednosci.app.adapter.in.web;

import java.util.List;
import org.springframework.stereotype.Component;
import pl.oszczednosci.app.domain.model.*;

@Component
public class ReferenceDataWebMapper {
    public InvestmentTypesResponse toInvestmentTypesResponse(List<InvestmentType> values) {
        return new InvestmentTypesResponse(names(values));
    }
    public InvestmentSubcategoriesResponse toSubcategoriesResponse(List<InvestmentSubcategory> values) {
        return new InvestmentSubcategoriesResponse(names(values));
    }
    public PortfolioUsersResponse toUsersResponse(List<OwnerId> values) {
        return new PortfolioUsersResponse(values.stream().map(OwnerId::value).toList());
    }
    public InvestmentOperationTypesResponse toOperationTypesResponse(List<InvestmentOperationType> values) {
        return new InvestmentOperationTypesResponse(names(values));
    }
    private List<String> names(List<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).toList();
    }
}
