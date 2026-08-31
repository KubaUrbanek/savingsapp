package pl.oszczednosci.app.application.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import pl.oszczednosci.app.application.port.in.*;
import pl.oszczednosci.app.application.port.out.*;
import pl.oszczednosci.app.application.port.in.CreateInvestmentOperationCommand;
import pl.oszczednosci.app.domain.model.*;
import pl.oszczednosci.app.domain.model.PortfolioPerformance;
import pl.oszczednosci.app.domain.model.InvestmentEntry;
import pl.oszczednosci.app.domain.model.InvestmentOperation;
import pl.oszczednosci.app.domain.model.InvestmentOperationType;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;
import pl.oszczednosci.app.application.port.out.InvestmentEntryRepository;
import pl.oszczednosci.app.application.port.out.InvestmentOperationRepository;

public final class InvestmentOperationUseCase implements CreateInvestmentOperationUseCase, ListInvestmentOperationsUseCase, DeleteInvestmentOperationUseCase {
    private static final int SCALE = 2;
    private final InvestmentOperationRepository operationRepository;
    private final InvestmentEntryRepository entryRepository;
    private final Clock clock;
    private final IdGenerator ids;

    public InvestmentOperationUseCase(InvestmentOperationRepository operationRepository,
            InvestmentEntryRepository entryRepository, Clock clock, IdGenerator ids) {
        this.operationRepository = operationRepository; this.entryRepository = entryRepository;
        this.clock = clock; this.ids = ids;
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
        PortfolioUser owner=filter.owner(); InvestmentType type=filter.type(); InvestmentSubcategory subcategory=filter.subcategory();
        if (type != null && subcategory != null) AssetCategory.of(type, subcategory);
        return operationRepository.findByOwner(owner).stream()
                .filter(operation -> type == null || operation.getType() == type)
                .filter(operation -> subcategory == null || operation.getSubcategory() == subcategory)
                .toList();
    }

    public void delete(UUID id) { operationRepository.deleteById(id); }

}
