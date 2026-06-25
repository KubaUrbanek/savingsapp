package pl.oszczednosci.app.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.oszczednosci.app.dto.CreateInvestmentEntryRequest;
import pl.oszczednosci.app.model.InvestmentEntry;
import pl.oszczednosci.app.model.InvestmentType;
import pl.oszczednosci.app.repository.InvestmentEntryRepository;

@Service
public class InvestmentEntryService {

    private final InvestmentEntryRepository repository;
    private final InvestmentTypePolicyRegistry policyRegistry;

    public InvestmentEntryService(InvestmentEntryRepository repository, InvestmentTypePolicyRegistry policyRegistry) {
        this.repository = repository;
        this.policyRegistry = policyRegistry;
    }

    @Transactional
    public InvestmentEntry create(CreateInvestmentEntryRequest request) {
        BigDecimal normalizedValue = policyRegistry.forType(request.type()).normalizePln(request.valuePln());
        InvestmentEntry entry = new InvestmentEntry(request.type(), normalizedValue, request.date());
        return repository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<InvestmentEntry> list(InvestmentType type) {
        if (type == null) {
            return repository.findAllByOrderByDateDescCreatedAtDesc();
        }
        return repository.findByTypeOrderByDateDescCreatedAtDesc(type);
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }
}
