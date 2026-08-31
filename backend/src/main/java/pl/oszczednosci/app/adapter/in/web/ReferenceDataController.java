package pl.oszczednosci.app.adapter.in.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import pl.oszczednosci.app.application.port.in.GetReferenceDataUseCase;

@RestController @RequestMapping("/api")
public class ReferenceDataController {
    private final GetReferenceDataUseCase referenceData;
    private final ReferenceDataWebMapper mapper;
    public ReferenceDataController(GetReferenceDataUseCase referenceData, ReferenceDataWebMapper mapper) {
        this.referenceData=referenceData; this.mapper=mapper;
    }
    @GetMapping("/investment-types") public InvestmentTypesResponse investmentTypes() {
        return mapper.toInvestmentTypesResponse(referenceData.investmentTypes());
    }
    @GetMapping("/investment-subcategories")
    public InvestmentSubcategoriesResponse investmentSubcategories(@Valid @ModelAttribute InvestmentSubcategoriesRequest request) {
        return mapper.toSubcategoriesResponse(referenceData.investmentSubcategories(request.type()));
    }
    @GetMapping("/users") public PortfolioUsersResponse users() {
        return mapper.toUsersResponse(referenceData.users());
    }
    @GetMapping("/investment-operation-types") public InvestmentOperationTypesResponse operationTypes() {
        return mapper.toOperationTypesResponse(referenceData.operationTypes());
    }
}
