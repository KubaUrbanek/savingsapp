package pl.oszczednosci.app.application.usecase;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.Clock;
import pl.oszczednosci.app.application.port.out.IdGenerator;
import pl.oszczednosci.app.application.port.out.InvestmentOperationRepository;
import pl.oszczednosci.app.application.port.out.InvestmentOperationCriteria;
import pl.oszczednosci.app.domain.model.*;

public final class InvestmentOperationUseCase implements CreateInvestmentOperationUseCase,
        ListInvestmentOperationsUseCase, DeleteInvestmentOperationUseCase {
    private final InvestmentOperationRepository operationRepository;
    private final Clock clock;
    private final IdGenerator ids;

    public InvestmentOperationUseCase(InvestmentOperationRepository operationRepository, Clock clock, IdGenerator ids) {
        this.operationRepository = operationRepository;
        this.clock = clock;
        this.ids = ids;
    }

    public InvestmentOperation create(CreateInvestmentOperationCommand request) {
        InvestmentOperation operation = InvestmentOperation.create(new InvestmentOperationId(ids.nextId()),
                request.operationType(), AssetCategory.of(request.type(), request.subcategory()),
                PortfolioOwner.of(request.owner()), Money.positive(request.amountPln()),
                Money.zeroOrPositive(request.feePln() == null ? BigDecimal.ZERO : request.feePln()),
                Money.zeroOrPositive(request.taxPln() == null ? BigDecimal.ZERO : request.taxPln()),
                request.date(), request.note(), clock.now());
        return operationRepository.save(operation);
    }

    public List<InvestmentOperation> list(InvestmentFilter filter) {
        if (filter.type() != null && filter.subcategory() != null) {
            AssetCategory.of(filter.type(), filter.subcategory());
        }
        return operationRepository.matching(new InvestmentOperationCriteria(filter.owner(), filter.type(), filter.subcategory()));
    }

    public void delete(UUID id) {
        operationRepository.delete(new InvestmentOperationId(id));
    }
}
