package pl.oszczednosci.app.adapter.in.web;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

import jakarta.validation.Valid;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import pl.oszczednosci.app.domain.model.InvestmentOperation;
import pl.oszczednosci.app.domain.model.InvestmentOperationType;
import pl.oszczednosci.app.domain.model.InvestmentSubcategory;
import pl.oszczednosci.app.domain.model.InvestmentType;
import pl.oszczednosci.app.domain.model.PortfolioUser;
import pl.oszczednosci.app.domain.service.InvestmentCategoryRules;
import pl.oszczednosci.app.application.port.in.*;

@RestController
@RequestMapping("/api")
public class InvestmentEntryController {

    private final CreateInvestmentEntryUseCase createEntry; private final UpdateInvestmentEntryUseCase updateEntry;
    private final ListInvestmentEntriesUseCase listEntries; private final DeleteInvestmentEntryUseCase deleteEntry;
    private final ImportInvestmentEntriesUseCase importEntries; private final ExportInvestmentEntriesUseCase exportEntries;
    private final CreateInvestmentOperationUseCase createOperation; private final ListInvestmentOperationsUseCase listOperations;
    private final DeleteInvestmentOperationUseCase deleteOperation; private final CalculatePortfolioPerformanceUseCase performance;

    public InvestmentEntryController(CreateInvestmentEntryUseCase createEntry, UpdateInvestmentEntryUseCase updateEntry,
            ListInvestmentEntriesUseCase listEntries, DeleteInvestmentEntryUseCase deleteEntry,
            ImportInvestmentEntriesUseCase importEntries, ExportInvestmentEntriesUseCase exportEntries,
            CreateInvestmentOperationUseCase createOperation, ListInvestmentOperationsUseCase listOperations,
            DeleteInvestmentOperationUseCase deleteOperation, CalculatePortfolioPerformanceUseCase performance) {
        this.createEntry=createEntry; this.updateEntry=updateEntry; this.listEntries=listEntries; this.deleteEntry=deleteEntry;
        this.importEntries=importEntries; this.exportEntries=exportEntries; this.createOperation=createOperation;
        this.listOperations=listOperations; this.deleteOperation=deleteOperation; this.performance=performance;
    }

    @GetMapping("/investment-types")
    public List<String> investmentTypes() {
        return Arrays.stream(InvestmentType.values())
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/investment-subcategories")
    public List<String> investmentSubcategories(@RequestParam InvestmentType type) {
        return InvestmentCategoryRules.allowedSubcategories(type).stream()
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/users")
    public List<String> users() {
        return Arrays.stream(PortfolioUser.values())
                .map(Enum::name)
                .toList();
    }

    @GetMapping("/investment-operation-types")
    public List<String> operationTypes() {
        return Arrays.stream(InvestmentOperationType.values()).map(Enum::name).toList();
    }

    @PostMapping("/investment-operations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentOperation createOperation(@Valid @RequestBody CreateInvestmentOperationRequest request) {
        return createOperation.create(request.toCommand());
    }

    @GetMapping("/investment-operations")
    public List<InvestmentOperation> operations(@RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory) {
        return listOperations.list(new InvestmentFilter(owner,type,subcategory));
    }

    @DeleteMapping("/investment-operations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOperation(@PathVariable UUID id) { deleteOperation.delete(id); }

    @GetMapping("/portfolio-performance")
    public PortfolioPerformanceResponse performance(@RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory,
            @RequestParam(required = false) LocalDate valuationDate) {
        return PortfolioPerformanceResponse.from(performance.calculate(new InvestmentFilter(owner,type,subcategory),
                valuationDate == null ? LocalDate.now() : valuationDate));
    }

    @PostMapping("/investments")
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentEntryResponse create(@Valid @RequestBody CreateInvestmentEntryRequest request) {
        return InvestmentEntryResponse.fromEntity(createEntry.create(request.toCommand()));
    }

    @PutMapping("/investments/{id}")
    public InvestmentEntryResponse update(@PathVariable UUID id, @Valid @RequestBody CreateInvestmentEntryRequest request) {
        return InvestmentEntryResponse.fromEntity(updateEntry.update(id, request.toCommand()));
    }

    @GetMapping("/investments")
    public List<InvestmentEntryResponse> list(
            @RequestParam PortfolioUser owner,
            @RequestParam(required = false) InvestmentType type,
            @RequestParam(required = false) InvestmentSubcategory subcategory
    ) {
        return listEntries.list(new InvestmentFilter(owner,type,subcategory)).stream()
                .map(InvestmentEntryResponse::fromEntity)
                .toList();
    }


    @GetMapping(value = "/database/export", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> exportDatabase() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("investment-entries-database.json")
                        .build()
                        .toString())
                .body(exportEntries.exportDatabase());
    }

    @PostMapping(value = "/database/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void importDatabase(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        importEntries.importDatabase(file.getBytes());
    }

    @DeleteMapping("/investments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        deleteEntry.delete(id);
    }
}
