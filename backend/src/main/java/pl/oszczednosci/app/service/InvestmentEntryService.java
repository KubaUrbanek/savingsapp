package pl.oszczednosci.app.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentSubcategory;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.model.PortfolioUser;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;

@Service
public class InvestmentEntryService {

    private final InvestmentEntryRepository repository;
    private final InvestmentTypePolicyRegistry policyRegistry;

    public InvestmentEntryService(InvestmentEntryRepository repository, InvestmentTypePolicyRegistry policyRegistry) {
        this.repository = repository;
        this.policyRegistry = policyRegistry;
    }

    public InvestmentEntry create(CreateInvestmentEntryRequest request) {
        InvestmentCategoryRules.validate(request.type(), request.subcategory());
        BigDecimal normalizedValue = policyRegistry.forType(request.type()).normalizePln(request.valuePln());
        InvestmentEntry entry = new InvestmentEntry(request.type(), request.owner(), request.subcategory(), normalizedValue, request.date());
        return repository.save(entry);
    }

    public List<InvestmentEntry> list(PortfolioUser owner, InvestmentType type, InvestmentSubcategory subcategory) {
        if (type == null) {
            return repository.findByOwnerOrderByDateDescCreatedAtDesc(owner);
        }
        if (subcategory != null) {
            InvestmentCategoryRules.validate(type, subcategory);
            return repository.findByOwnerAndTypeAndSubcategoryOrderByDateDescCreatedAtDesc(owner, type, subcategory);
        }
        return repository.findByOwnerAndTypeOrderByDateDescCreatedAtDesc(owner, type);
    }

    public InvestmentEntry update(UUID id, CreateInvestmentEntryRequest request) {
        InvestmentCategoryRules.validate(request.type(), request.subcategory());
        InvestmentEntry entry = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investment entry not found"));
        BigDecimal normalizedValue = policyRegistry.forType(request.type()).normalizePln(request.valuePln());
        entry.update(request.type(), request.owner(), request.subcategory(), normalizedValue, request.date());
        return repository.save(entry);
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
