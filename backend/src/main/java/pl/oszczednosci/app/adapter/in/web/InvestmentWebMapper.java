package pl.oszczednosci.app.adapter.in.web;

import org.springframework.stereotype.Component;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.domain.model.*;

@Component
public class InvestmentWebMapper {
    public CreateInvestmentEntryCommand toCommand(CreateInvestmentEntryRequest request) {
        return new CreateInvestmentEntryCommand(request.type(), request.owner(), request.subcategory(),
                request.valuePln(), request.date());
    }

    public CreateInvestmentOperationCommand toCommand(CreateInvestmentOperationRequest request) {
        return new CreateInvestmentOperationCommand(request.operationType(), request.type(), request.owner(),
                request.subcategory(), request.amountPln(), request.feePln(), request.taxPln(), request.date(), request.note());
    }

    public InvestmentFilter toFilter(InvestmentFilterRequest request) {
        return new InvestmentFilter(request.owner(), request.type(), request.subcategory());
    }

    public InvestmentEntryResponse toResponse(InvestmentEntry entry) {
        return new InvestmentEntryResponse(entry.getId(), entry.getType(), entry.getOwner(), entry.getSubcategory(),
                entry.getValuePln(), entry.getDate(), entry.getCreatedAt(), entry.getUpdatedAt());
    }

    public InvestmentOperationResponse toResponse(InvestmentOperation operation) {
        return new InvestmentOperationResponse(operation.getId(), operation.getOperationType(), operation.getType(),
                operation.getOwner(), operation.getSubcategory(), operation.getAmountPln(), operation.getFeePln(),
                operation.getTaxPln(), operation.getDate(), operation.getNote(), operation.getCreatedAt());
    }

    public PortfolioPerformanceResponse toResponse(PortfolioPerformance performance) {
        return new PortfolioPerformanceResponse(performance.currentValuePln(), performance.contributedCapitalPln(),
                performance.nominalResultPln(), performance.returnRatePercent(), performance.feesPln(),
                performance.taxesPln(), performance.resultAfterFeesAndTaxesPln(), performance.xirrPercent(),
                performance.monthlyResultPln(), performance.monthlyReturnRatePercent());
    }
}
