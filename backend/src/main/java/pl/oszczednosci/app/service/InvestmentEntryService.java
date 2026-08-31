package pl.oszczednosci.app.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.model.AssetCategory;
import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentEntryId;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.Money;
import pl.oszczednosci.app.model.PortfolioOwner;
import pl.oszczednosci.app.model.PortfolioUser;
import pl.oszczednosci.app.application.port.IdGenerator;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;

@Service
public class InvestmentEntryService {

    private final InvestmentEntryRepository repository;
    private final InvestmentTypePolicyRegistry policyRegistry;
    private final IdGenerator idGenerator;
    private final Clock clock;

    public InvestmentEntryService(InvestmentEntryRepository repository, InvestmentTypePolicyRegistry policyRegistry, IdGenerator idGenerator, Clock clock) {
        this.repository = repository;
        this.policyRegistry = policyRegistry;
        this.idGenerator = idGenerator;
        this.clock = clock;
    }

    public InvestmentEntry create(CreateInvestmentEntryRequest request) {
        BigDecimal normalizedValue = policyRegistry.forType(request.type()).normalizePln(request.valuePln());
        InvestmentEntry entry = InvestmentEntry.create(new InvestmentEntryId(idGenerator.nextId()),
                AssetCategory.of(request.type(), request.subcategory()), PortfolioOwner.of(request.owner()),
                Money.positive(normalizedValue), request.date(), clock.instant());
        return repository.save(entry);
    }

    public List<InvestmentEntry> list(PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory) {
        if (type == null) {
            return repository.findByOwnerOrderByDateDescCreatedAtDesc(owner);
        }
        if (subcategory != null) {
            AssetCategory.of(type, subcategory);
            return repository.findByOwnerAndTypeAndSubcategoryOrderByDateDescCreatedAtDesc(owner, type, subcategory);
        }
        return repository.findByOwnerAndTypeOrderByDateDescCreatedAtDesc(owner, type);
    }

    public InvestmentEntry update(UUID id, CreateInvestmentEntryRequest request) {
        InvestmentEntry entry = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investment entry not found"));
        BigDecimal normalizedValue = policyRegistry.forType(request.type()).normalizePln(request.valuePln());
        InvestmentEntry updated = entry.update(AssetCategory.of(request.type(), request.subcategory()),
                PortfolioOwner.of(request.owner()), Money.positive(normalizedValue), request.date(), clock.instant());
        return repository.save(updated);
    }

    public byte[] exportDatabase() {
        return repository.exportDatabase();
    }

    public void importDatabase(byte[] databaseContents) {
        repository.importDatabase(databaseContents);
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }
}
